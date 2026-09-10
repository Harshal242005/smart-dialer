import { describe, it, expect } from "vitest";
import { CallManager } from "../src/calls/CallManager";
import { CallState } from "../src/models/call";

describe("Idempotent Event Handling", () => {
  it("should ignore duplicate ANSWERED events", () => {
    const cm = new CallManager();
    const call = cm.createCall("B1");

    cm.updateState(call.id, CallState.RESERVED, { agentId: "A1" });
    cm.updateState(call.id, CallState.INITIATED);
    cm.updateState(call.id, CallState.RINGING);
    cm.updateState(call.id, CallState.ANSWERED);

    // Duplicate ANSWERED must be rejected
    const dup = cm.updateState(call.id, CallState.ANSWERED);
    expect(dup.success).toBe(false);
    expect(dup.error).toContain("Cannot transition");
  });

  it("should reject out-of-order COMPLETED before ANSWERED", () => {
    const cm = new CallManager();
    const call = cm.createCall("B2");

    cm.updateState(call.id, CallState.RESERVED, { agentId: "A1" });
    cm.updateState(call.id, CallState.INITIATED);

    // COMPLETED is invalid from INITIATED
    const result = cm.updateState(call.id, CallState.COMPLETED);
    expect(result.success).toBe(false);
  });

  it("should reject duplicate RESERVED on the same call", () => {
    const cm = new CallManager();
    const call = cm.createCall("B3");

    cm.updateState(call.id, CallState.RESERVED, { agentId: "A1" });
    const dup = cm.updateState(call.id, CallState.RESERVED, { agentId: "A2" });
    expect(dup.success).toBe(false);
  });
});
