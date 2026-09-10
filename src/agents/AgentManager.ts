import { Agent, AgentState, canTransition } from "../models/agent";

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  addAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAvailableAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.state === AgentState.AVAILABLE,
    );
  }

  updateState(
    id: string,
    newState: AgentState,
  ): { success: boolean; error?: string } {
    const agent = this.agents.get(id);

    if (!agent) {
      return { success: false, error: `Agent ${id} not found` };
    }

    // Check if transition is valid
    if (!canTransition(agent.state, newState)) {
      return {
        success: false,
        error: `Cannot transition from ${agent.state} to ${newState}`,
      };
    }

    agent.state = newState;
    return { success: true };
  }

  // Atomic reserve operation - important for concurrency
  tryReserveAgent(id: string): { success: boolean; error?: string } {
    const agent = this.agents.get(id);

    if (!agent) {
      return { success: false, error: `Agent ${id} not found` };
    }

    if (agent.state !== AgentState.AVAILABLE) {
      return {
        success: false,
        error: `Agent ${id} is not available (state: ${agent.state})`,
      };
    }

    return this.updateState(id, AgentState.RESERVED);
  }
}
