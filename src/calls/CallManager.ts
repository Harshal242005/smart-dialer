import { Call, CallState, canCallTransition, createCall } from "../models/call";

export class CallManager {
  private calls: Map<string, Call> = new Map();

  createCall(borrowerId: string): Call {
    const id = `call-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const call = createCall(id, borrowerId);
    this.calls.set(id, call);
    return call;
  }

  getCallsWaitingForAgent(): Call[] {
    return Array.from(this.calls.values()).filter(
      (call) =>
        (call.state === CallState.QUEUED ||
          call.state === CallState.RESERVED) &&
        !call.agentId,
    );
  }

  getCall(id: string): Call | undefined {
    return this.calls.get(id);
  }

  getCallsByState(state: CallState): Call[] {
    return Array.from(this.calls.values()).filter(
      (call) => call.state === state,
    );
  }

  getActiveCalls(): Call[] {
    const activeStates = [
      CallState.QUEUED,
      CallState.RESERVED,
      CallState.INITIATED,
      CallState.RINGING,
      CallState.ANSWERED,
      CallState.CONNECTED,
    ];
    return Array.from(this.calls.values()).filter((call) =>
      activeStates.includes(call.state),
    );
  }

  updateState(
    id: string,
    newState: CallState,
    metadata?: Partial<Call>,
  ): { success: boolean; error?: string; call?: Call } {
    const call = this.calls.get(id);

    if (!call) {
      return { success: false, error: `Call ${id} not found` };
    }

    if (!canCallTransition(call.state, newState)) {
      return {
        success: false,
        error: `Cannot transition call from ${call.state} to ${newState}`,
      };
    }

    call.state = newState;
    call.updatedAt = new Date();

    // Apply any additional metadata
    if (metadata) {
      Object.assign(call, metadata);
    }

    return { success: true, call };
  }

  // Atomic reserve operation for calls (similar to agents)
  tryReserveCall(
    id: string,
    agentId: string,
  ): { success: boolean; error?: string } {
    const call = this.calls.get(id);

    if (!call) {
      return { success: false, error: `Call ${id} not found` };
    }

    if (call.state !== CallState.QUEUED) {
      return {
        success: false,
        error: `Call ${id} is not queued (state: ${call.state})`,
      };
    }

    const result = this.updateState(id, CallState.RESERVED, { agentId });
    return { success: result.success, error: result.error };
  }
}
