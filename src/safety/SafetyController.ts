import { AgentManager } from "../agents/AgentManager";
import { CallManager } from "../calls/CallManager";
import { CallState } from "../models/call";

export interface SafetyDecision {
  approved: boolean;
  approvedCalls: number;
  requestedCalls: number;
  reason: string;
  fallbackToProgressive: boolean;
  safetyViolation?: string;
}

export class SafetyController {
  private agentManager: AgentManager;
  private callManager: CallManager;

  constructor(agentManager: AgentManager, callManager: CallManager) {
    this.agentManager = agentManager;
    this.callManager = callManager;
  }

  /**
   * The safety controller is the final gatekeeper
   * It can:
   * 1. APPROVE - allow the requested calls
   * 2. REDUCE - allow fewer calls than requested
   * 3. REJECT - allow no calls
   * 4. FALLBACK_TO_PROGRESSIVE - use progressive dialing instead
   */
  evaluate(
    requestedCalls: number,
    isPredictive: boolean = true,
  ): SafetyDecision {
    // Get current state
    const availableAgents = this.agentManager.getAvailableAgents().length;
    const activeCalls = this.callManager.getActiveCalls().length;

    console.log(
      `[SafetyController] Evaluating request: ${requestedCalls} calls (predictive: ${isPredictive})`,
    );
    console.log(
      `[SafetyController] Available agents: ${availableAgents}, Active calls: ${activeCalls}`,
    );

    // SAFETY RULE 1: NEVER exceed available agents
    if (requestedCalls > availableAgents) {
      console.log(
        `[SafetyController] ⚠️ Requested ${requestedCalls} > available ${availableAgents} - REDUCING`,
      );
      const reduced = availableAgents;

      // If the reduction is significant, suggest fallback to progressive
      const shouldFallback =
        reduced === 0 || requestedCalls > availableAgents * 2;

      return {
        approved: reduced > 0,
        approvedCalls: reduced,
        requestedCalls,
        reason: `Reduced from ${requestedCalls} to ${reduced} due to agent availability`,
        fallbackToProgressive: shouldFallback && isPredictive,
        safetyViolation: shouldFallback
          ? "Requested calls significantly exceed available agents"
          : undefined,
      };
    }

    // SAFETY RULE 2: Check if we have enough agents in proper state
    const availableAgentCount = this.agentManager.getAvailableAgents().length;
    if (availableAgentCount === 0 && requestedCalls > 0) {
      console.log(`[SafetyController] ⚠️ No available agents - REJECTING`);
      return {
        approved: false,
        approvedCalls: 0,
        requestedCalls,
        reason: "No available agents to handle calls",
        fallbackToProgressive: true,
        safetyViolation: "Zero available agents",
      };
    }

    // SAFETY RULE 3: Check for potential abandonment (connected calls without agents)
    const ringingCalls = this.callManager.getCallsByState(
      CallState.RINGING,
    ).length;
    const answeredCalls = this.callManager.getCallsByState(
      CallState.ANSWERED,
    ).length;
    const pendingConnections = ringingCalls + answeredCalls;

    if (pendingConnections > 0 && availableAgentCount === 0) {
      console.log(
        `[SafetyController] ⚠️ ${pendingConnections} calls ringing/answered but no agents - SAFETY BREACH!`,
      );
      return {
        approved: false,
        approvedCalls: 0,
        requestedCalls,
        reason: `Safety breach detected: ${pendingConnections} calls ringing/answered with no available agents`,
        fallbackToProgressive: true,
        safetyViolation: `Abandon risk: ${pendingConnections} calls pending connection`,
      };
    }

    // SAFETY RULE 4: Progressive vs Predictive
    if (isPredictive) {
      // For predictive, we can be more aggressive but still safe
      const maxAllowed = Math.min(requestedCalls, availableAgents);

      if (maxAllowed < requestedCalls) {
        console.log(
          `[SafetyController] 🔄 Reducing predictive request: ${requestedCalls} → ${maxAllowed}`,
        );
        return {
          approved: true,
          approvedCalls: maxAllowed,
          requestedCalls,
          reason: `Predictive request reduced from ${requestedCalls} to ${maxAllowed} (agent limit)`,
          fallbackToProgressive: false,
        };
      }

      console.log(
        `[SafetyController] ✅ APPROVING predictive request: ${requestedCalls} calls`,
      );
      return {
        approved: true,
        approvedCalls: requestedCalls,
        requestedCalls,
        reason: "Predictive request approved within safety limits",
        fallbackToProgressive: false,
      };
    }

    // SAFETY RULE 5: Progressive dialing is always safe
    console.log(
      `[SafetyController] ✅ Progressive dialing: ${requestedCalls} calls`,
    );
    return {
      approved: true,
      approvedCalls: requestedCalls,
      requestedCalls,
      reason: "Progressive dialing always safe",
      fallbackToProgressive: false,
    };
  }

  /**
   * Emergency stop - immediately stop all dialing
   */
  emergencyStop(): void {
    console.log("[SafetyController] 🚨 EMERGENCY STOP ACTIVATED");
    // In a real system, this would halt all dialing operations
    // For our simulation, we just log it
  }

  /**
   * Check if the system is currently safe
   */
  isSystemSafe(): boolean {
    const waitingCalls = this.callManager.getCallsWaitingForAgent().length;
    // System is safe if there are no calls waiting for an agent
    return waitingCalls === 0;
  }
}
