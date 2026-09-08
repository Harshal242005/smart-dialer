export enum CallState {
  QUEUED = "QUEUED",
  RESERVED = "RESERVED",
  INITIATED = "INITIATED",
  RINGING = "RINGING",
  ANSWERED = "ANSWERED",
  CONNECTED = "CONNECTED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export interface Call {
  id: string;
  borrowerId: string;
  agentId?: string;
  state: CallState;
  createdAt: Date;
  updatedAt: Date;
  attemptCount?: number;
  providerId?: string;
}

// Valid transitions for calls
const validCallTransitions: Record<CallState, CallState[]> = {
  [CallState.QUEUED]: [CallState.RESERVED, CallState.CANCELLED],
  [CallState.RESERVED]: [CallState.INITIATED, CallState.CANCELLED],
  [CallState.INITIATED]: [CallState.RINGING, CallState.FAILED],
  [CallState.RINGING]: [CallState.ANSWERED, CallState.FAILED],
  [CallState.ANSWERED]: [CallState.CONNECTED, CallState.FAILED],
  [CallState.CONNECTED]: [CallState.COMPLETED, CallState.FAILED],
  [CallState.COMPLETED]: [],
  [CallState.FAILED]: [],
  [CallState.CANCELLED]: [],
};

export function canCallTransition(from: CallState, to: CallState): boolean {
  const allowed = validCallTransitions[from];
  return allowed ? allowed.includes(to) : false;
}

export function createCall(id: string, borrowerId: string): Call {
  const now = new Date();
  return {
    id,
    borrowerId,
    state: CallState.QUEUED,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
  };
}
