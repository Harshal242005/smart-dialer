import { AgentManager } from "../src/agents/AgentManager";
import { AgentState } from "../src/models/agent";

const manager = new AgentManager();

manager.addAgent({
  id: "A1",
  name: "Agent 1",
  state: AgentState.AVAILABLE,
});

manager.addAgent({
  id: "A2",
  name: "Agent 2",
  state: AgentState.OFFLINE,
});

console.log("Available agents:");
console.log(manager.getAvailableAgents());
