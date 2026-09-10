import { AgentManager } from "../agents/AgentManager";
import { CallManager } from "../calls/CallManager";
import { AgentState } from "../models/agent";
import { CallState } from "../models/call";

export class TimeoutCleanup {
  constructor(
    private agentManager: AgentManager,
    private callManager: CallManager,
    private timeoutMs: number = 30000,
  ) {}

  /**
   * Release agents and cancel calls that have been stuck too long.
   * Returns the number of agents released.
   */
  cleanup(): number {
    const now = Date.now();
    let released = 0;

    // 1. Release stale agents (RESERVED or DIALING for too long)
    for (const agent of this.agentManager.getAllAgents()) {
      const stuck =
        agent.state === AgentState.RESERVED ||
        agent.state === AgentState.DIALING;
      const tooOld = agent.reservedAt
        ? now - agent.reservedAt.getTime() > this.timeoutMs
        : false;

      if (stuck && tooOld) {
        console.log(
          `[TimeoutCleanup] Releasing stale agent ${agent.id} (state: ${agent.state}, stuck for ${((now - agent.reservedAt!.getTime()) / 1000).toFixed(1)}s)`,
        );
        this.agentManager.updateState(agent.id, AgentState.AVAILABLE);
        released++;
      }
    }

    // 2. Cancel stale calls that never got an agent assigned
    for (const call of this.callManager.getCallsWaitingForAgent()) {
      if (now - call.createdAt.getTime() > this.timeoutMs) {
        console.log(`[TimeoutCleanup] Cancelling stale call ${call.id}`);
        this.callManager.updateState(call.id, CallState.CANCELLED);
      }
    }

    if (released > 0) {
      console.log(`[TimeoutCleanup] ✅ Released ${released} stale agent(s)`);
    }
    return released;
  }

  /**
   * Run cleanup on an interval (useful for production).
   */
  startCleanupInterval(intervalMs: number = 10000): NodeJS.Timeout {
    return setInterval(() => this.cleanup(), intervalMs);
  }

  stopCleanupInterval(handle: NodeJS.Timeout): void {
    clearInterval(handle);
  }
}
