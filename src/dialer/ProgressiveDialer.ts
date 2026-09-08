import { AgentManager } from "../agents/AgentManager";
import { AgentState } from "../models/agent";
import { CallManager } from "../calls/CallManager";
import { CallState } from "../models/call";
import { TelecomProvider } from "../providers/TelecomProvider";

export interface DialerConfig {
  maxConcurrentCallsPerAgent: number; // Usually 1
  callTimeoutMs: number;
  retryAttempts: number;
}

export class ProgressiveDialer {
  private agentManager: AgentManager;
  private callManager: CallManager;
  private provider: TelecomProvider;
  private config: DialerConfig;

  constructor(
    agentManager: AgentManager,
    callManager: CallManager,
    provider: TelecomProvider,
    config?: Partial<DialerConfig>,
  ) {
    this.agentManager = agentManager;
    this.callManager = callManager;
    this.provider = provider;
    this.config = {
      maxConcurrentCallsPerAgent: 1,
      callTimeoutMs: 30000,
      retryAttempts: 3,
      ...config,
    };
  }

  /**
   * Progressive dialing: Only dial exactly as many calls as there are available agents
   * This is the SAFE approach - never dial more than agents can handle
   */
  async dialProgressive(borrowerIds: string[]): Promise<{
    dialed: number;
    failed: number;
    results: Array<{ callId: string; success: boolean; error?: string }>;
  }> {
    const availableAgents = this.agentManager.getAvailableAgents();
    const maxCalls = Math.min(availableAgents.length, borrowerIds.length);

    console.log(
      `[ProgressiveDialer] Available agents: ${availableAgents.length}, Borrowers: ${borrowerIds.length}, Max calls: ${maxCalls}`,
    );
    console.log(
      `[ProgressiveDialer] Config: maxConcurrentCallsPerAgent=${this.config.maxConcurrentCallsPerAgent}, timeout=${this.config.callTimeoutMs}ms`,
    );

    if (maxCalls === 0) {
      return { dialed: 0, failed: 0, results: [] };
    }

    const results: Array<{ callId: string; success: boolean; error?: string }> =
      [];
    let dialed = 0;
    let failed = 0;

    for (let i = 0; i < maxCalls; i++) {
      const agent = availableAgents[i];
      const borrowerId = borrowerIds[i];

      try {
        const result = await this.dialSingleCall(agent.id, borrowerId);
        results.push(result);
        if (result.success) {
          dialed++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        results.push({
          callId: `failed-${i}`,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { dialed, failed, results };
  }

  /**
   * Dial a single call with an agent
   * This is an atomic operation - reserve agent + create call + initiate call
   */
  private async dialSingleCall(
    agentId: string,
    borrowerId: string,
  ): Promise<{
    callId: string;
    success: boolean;
    error?: string;
  }> {
    let callId: string = "";
    let retryCount = 0;

    try {
      // Step 1: Try to reserve the agent atomically
      const reserveResult = this.agentManager.tryReserveAgent(agentId);
      if (!reserveResult.success) {
        return {
          callId: "",
          success: false,
          error: `Failed to reserve agent ${agentId}: ${reserveResult.error}`,
        };
      }

      // Step 2: Create a call
      const call = this.callManager.createCall(borrowerId);
      callId = call.id;

      // Step 3: Reserve the call with this agent
      const callReserveResult = this.callManager.tryReserveCall(
        call.id,
        agentId,
      );
      if (!callReserveResult.success) {
        this.agentManager.updateState(agentId, AgentState.AVAILABLE);
        return {
          callId,
          success: false,
          error: `Failed to reserve call: ${callReserveResult.error}`,
        };
      }

      // Step 4: Update agent to DIALING
      this.agentManager.updateState(agentId, AgentState.DIALING);

      // Step 5: Initiate call via provider with retry logic
      this.callManager.updateState(call.id, CallState.INITIATED);

      let providerResult = await this.provider.placeCall(
        borrowerId,
        agentId,
        call.id,
      );

      while (
        !providerResult.success &&
        retryCount < this.config.retryAttempts
      ) {
        retryCount++;
        console.log(
          `[ProgressiveDialer] Retry ${retryCount}/${this.config.retryAttempts} for call ${call.id}`,
        );
        providerResult = await this.provider.placeCall(
          borrowerId,
          agentId,
          call.id,
        );
      }

      if (!providerResult.success) {
        // Provider failed – release everything
        this.callManager.updateState(call.id, CallState.FAILED);
        this.agentManager.updateState(agentId, AgentState.AVAILABLE);
        return {
          callId: call.id,
          success: false,
          error: providerResult.error || "Provider call failed",
        };
      }

      // ------------------- NEW: process provider answer event -------------------
      const metadata = providerResult.metadata || {};
      const answered = metadata.answered === true;

      // Call is ringing
      this.callManager.updateState(call.id, CallState.RINGING);

      if (answered) {
        // 1. Call answered -> transition to ANSWERED
        this.callManager.updateState(call.id, CallState.ANSWERED);
        // Agent is now connected (from DIALING -> CONNECTED)
        this.agentManager.updateState(agentId, AgentState.CONNECTED);

        // 2. Simulate talk time (use duration from provider or random 30-120s)
        const talkDuration =
          metadata.duration || Math.floor(Math.random() * 90) + 30;
        console.log(
          `[ProgressiveDialer] Call ${call.id} connected, talk time ${talkDuration}s`,
        );

        // Schedule call completion
        setTimeout(() => {
          // Call ends
          this.callManager.updateState(call.id, CallState.COMPLETED);
          // Agent wrap-up
          this.agentManager.updateState(agentId, AgentState.WRAP_UP);
          // After a short wrap-up, become available
          setTimeout(() => {
            this.agentManager.updateState(agentId, AgentState.AVAILABLE);
            console.log(
              `[ProgressiveDialer] Agent ${agentId} is now AVAILABLE`,
            );
          }, 2000); // 2 sec wrap-up
        }, talkDuration * 1000);

        return { callId: call.id, success: true };
      } else {
        // No answer -> fail the call
        this.callManager.updateState(call.id, CallState.FAILED);
        this.agentManager.updateState(agentId, AgentState.AVAILABLE);
        return { callId: call.id, success: false, error: "No answer" };
      }
    } catch (error) {
      // Error occurred - clean up
      if (callId) {
        this.callManager.updateState(callId, CallState.FAILED);
      }
      const agent = this.agentManager.getAgent(agentId);
      if (
        agent &&
        (agent.state === AgentState.RESERVED ||
          agent.state === AgentState.DIALING)
      ) {
        this.agentManager.updateState(agentId, AgentState.AVAILABLE);
      }
      return {
        callId: callId || "unknown",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle call answer (called when provider notifies)
   * Kept for possible external event handling, but not used in the current flow.
   */
  handleCallAnswered(callId: string): boolean {
    const call = this.callManager.getCall(callId);
    if (!call) return false;

    const result = this.callManager.updateState(callId, CallState.ANSWERED);
    if (result.success && call.agentId) {
      this.agentManager.updateState(call.agentId, AgentState.CONNECTED);
      return true;
    }
    return false;
  }

  /**
   * Handle call completion (called when call ends)
   * Kept for possible external event handling, but not used in the current flow.
   */
  handleCallCompleted(callId: string): boolean {
    const call = this.callManager.getCall(callId);
    if (!call) return false;

    const result = this.callManager.updateState(callId, CallState.COMPLETED);
    if (result.success && call.agentId) {
      this.agentManager.updateState(call.agentId, AgentState.WRAP_UP);
      this.agentManager.updateState(call.agentId, AgentState.AVAILABLE);
      return true;
    }
    return false;
  }
}
