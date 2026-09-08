export enum AgentState {
  OFFLINE = "OFFLINE",
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  DIALING = "DIALING",
  CONNECTED = "CONNECTED",
  WRAP_UP = "WRAP_UP",
  PAUSED = "PAUSED",
}

export interface Agent {
  id: string;
  name: string;
  state: AgentState;
}

// Define valid state transitions
const validTransitions: Record<AgentState, AgentState[]> = {
  [AgentState.OFFLINE]: [AgentState.AVAILABLE],
  [AgentState.AVAILABLE]: [
    AgentState.RESERVED,
    AgentState.PAUSED,
    AgentState.OFFLINE,
  ],
  [AgentState.PAUSED]: [AgentState.AVAILABLE],
  [AgentState.RESERVED]: [AgentState.DIALING, AgentState.AVAILABLE], // can timeout back to available
  [AgentState.DIALING]: [AgentState.CONNECTED, AgentState.AVAILABLE], // if call fails
  [AgentState.CONNECTED]: [AgentState.WRAP_UP],
  [AgentState.WRAP_UP]: [AgentState.AVAILABLE],
};

export function canTransition(from: AgentState, to: AgentState): boolean {
  const allowed = validTransitions[from];
  return allowed ? allowed.includes(to) : false;
}

export interface Agent {
  id: string;
  name: string;
  state: AgentState;
  reservedAt?: Date; // timestamp when reserved
}