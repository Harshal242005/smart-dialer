import { AgentManager } from "../agents/AgentManager";
import { CallManager } from "../calls/CallManager";
import { AgentState } from "../models/agent";
import { CallState } from "../models/call";

export class TimeoutCleanup {
  private agentManager: AgentManager;
  private callManager: CallManager;
  private timeoutMs: number;

  constructor(
    agentManager: AgentManager,
    callManager: CallManager,
    timeoutMs: number = 30000,
  ) {
    this.agentManager = agentManager;
    this.callManager = callManager;
    this.timeoutMs = timeoutMs;
  }

  // Check for stale agents/calls and release them
  cleanup(): void {
    const now = Date.now();
    const timeoutMs = this.timeoutMs;
    let released = 0;

    // Check all agents
    for (const [id, agent] of this.agentManager["agents"]) {
      // access private Map – better to add a method to AgentManager
      if (agent.reservedAt && now - agent.reservedAt.getTime() > timeoutMs) {
        console.log(
          `[TimeoutCleanup] Releasing stale agent ${agent.id} (reserved at ${agent.reservedAt})`,
        );
        this.agentManager.updateState(agent.id, AgentState.AVAILABLE);
        released++;
      }
    }

    // Also release calls without agents
    const waitingCalls = this.callManager.getCallsWaitingForAgent();
    for (const call of waitingCalls) {
      if (call.createdAt && now - call.createdAt.getTime() > timeoutMs) {
        console.log(`[TimeoutCleanup] Cancelling stale call ${call.id}`);
        this.callManager.updateState(call.id, CallState.CANCELLED);
      }
    }

    console.log(`[TimeoutCleanup] Released ${released} stale agents`);
  }

  // Call this periodically (e.g., every 10 seconds)
  startCleanupInterval(intervalMs: number = 10000): NodeJS.Timeout {
    return setInterval(() => this.cleanup(), intervalMs);
  }
}
