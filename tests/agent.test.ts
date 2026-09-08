import { describe, it, expect } from "vitest";
import { AgentManager } from "../src/agents/AgentManager";
import { AgentState, canTransition } from "../src/models/agent";

describe("Agent State Machine", () => {
  it("should transition AVAILABLE → RESERVED → DIALING → CONNECTED → WRAP_UP → AVAILABLE", () => {
    const manager = new AgentManager();
    manager.addAgent({ id: "A1", name: "Test", state: AgentState.AVAILABLE });

    // AVAILABLE → RESERVED
    let result = manager.tryReserveAgent("A1");
    expect(result.success).toBe(true);
    expect(manager.getAgent("A1")?.state).toBe(AgentState.RESERVED);

    // RESERVED → DIALING
    result = manager.updateState("A1", AgentState.DIALING);
    expect(result.success).toBe(true);
    expect(manager.getAgent("A1")?.state).toBe(AgentState.DIALING);

    // DIALING → CONNECTED
    result = manager.updateState("A1", AgentState.CONNECTED);
    expect(result.success).toBe(true);
    expect(manager.getAgent("A1")?.state).toBe(AgentState.CONNECTED);

    // CONNECTED → WRAP_UP
    result = manager.updateState("A1", AgentState.WRAP_UP);
    expect(result.success).toBe(true);
    expect(manager.getAgent("A1")?.state).toBe(AgentState.WRAP_UP);

    // WRAP_UP → AVAILABLE
    result = manager.updateState("A1", AgentState.AVAILABLE);
    expect(result.success).toBe(true);
    expect(manager.getAgent("A1")?.state).toBe(AgentState.AVAILABLE);
  });

  it("should reject invalid transitions", () => {
    const manager = new AgentManager();
    manager.addAgent({ id: "A1", name: "Test", state: AgentState.AVAILABLE });

    // AVAILABLE → CONNECTED is invalid
    const result = manager.updateState("A1", AgentState.CONNECTED);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
  });

  it("should prevent double reservation", () => {
    const manager = new AgentManager();
    manager.addAgent({ id: "A1", name: "Test", state: AgentState.AVAILABLE });

    const first = manager.tryReserveAgent("A1");
    expect(first.success).toBe(true);

    const second = manager.tryReserveAgent("A1");
    expect(second.success).toBe(false);
    expect(second.error).toContain("not available");
  });
});
