import { AgentManager } from "./agents/AgentManager";
import { AgentState } from "./models/agent";
import { CallManager } from "./calls/CallManager";
import { CallState } from "./models/call";
import { ProgressiveDialer } from "./dialer/ProgressiveDialer";
import { FastProvider } from "./providers/FastProvider";
import { UnreliableProvider } from "./providers/UnreliableProvider";
import { PacingEngine } from "./pacing/PacingEngine";
import { SafetyController } from "./safety/SafetyController";
import { TimeoutCleanup } from "./utils/TimeoutCleanup";

interface Scenario {
  name: string;
  answerRate: number;
  avgTalkTime: number;
  agents: number;
  borrowers: number;
  providerType: "fast" | "unreliable";
}

async function runScenario(scenario: Scenario) {
  console.log(`\n=== Scenario: ${scenario.name} ===`);
  console.log(
    `Answer rate: ${scenario.answerRate * 100}%, Avg talk time: ${scenario.avgTalkTime}s`,
  );

  const agentManager = new AgentManager();
  const callManager = new CallManager();

  // Add agents
  for (let i = 1; i <= scenario.agents; i++) {
    agentManager.addAgent({
      id: `A${i}`,
      name: `Agent ${i}`,
      state: AgentState.AVAILABLE,
    });
  }

  // ✅ Provider now receives the scenario's answer rate
  const provider =
    scenario.providerType === "fast"
      ? new FastProvider("fast-provider", scenario.answerRate)
      : new UnreliableProvider(
          "unreliable-provider",
          0.1,
          0.1,
          200,
          scenario.answerRate,
        );

  const dialer = new ProgressiveDialer(agentManager, callManager, provider);
  const pacingEngine = new PacingEngine(callManager, agentManager);
  const safetyController = new SafetyController(agentManager, callManager);

  // Override pacing engine's answer rate to match scenario
  pacingEngine.updateAnswerRate(scenario.answerRate);

  // Borrowers
  const borrowers = Array.from(
    { length: scenario.borrowers },
    (_, i) => `Borrower-${i + 1}`,
  );

  // Get pacing recommendation
  const recommendation = pacingEngine.analyze();
  const safetyDecision = safetyController.evaluate(
    recommendation.recommendedCalls,
    true,
  );

  // Dial
  const startTime = Date.now();
  const dialResult = await dialer.dialProgressive(
    borrowers.slice(0, safetyDecision.approvedCalls),
  );
  const duration = (Date.now() - startTime) / 1000;

  // Wait briefly for state transitions
  await new Promise((resolve) => setTimeout(resolve, 500));

  // ✅ Run timeout cleanup to release any stale agents/calls
  const cleanup = new TimeoutCleanup(agentManager, callManager, 1000);
  cleanup.cleanup();

  // Collect metrics
  const activeCalls = callManager.getActiveCalls();
  const answeredCalls = activeCalls.filter(
    (c) => c.state === CallState.ANSWERED || c.state === CallState.CONNECTED,
  );
  const completedCalls = callManager.getCallsByState(
    CallState.COMPLETED,
  ).length;
  const waitingCalls = callManager.getCallsWaitingForAgent().length;
  const availableAgents = agentManager.getAvailableAgents().length;

  console.log(`Metrics:`);
  console.log(`  Dialed: ${dialResult.dialed}`);
  console.log(`  Failed: ${dialResult.failed}`);
  console.log(`  Answered: ${answeredCalls.length}`);
  console.log(`  Completed: ${completedCalls}`);
  console.log(`  Waiting for agent: ${waitingCalls}`);
  console.log(`  Available agents: ${availableAgents}`);
  console.log(`  Duration: ${duration.toFixed(2)}s`);

  return {
    scenario,
    dialed: dialResult.dialed,
    failed: dialResult.failed,
    answered: answeredCalls.length,
    completed: completedCalls,
    waiting: waitingCalls,
    availableAgents,
    duration,
  };
}

async function runDynamicScenario() {
  console.log("\n=== Dynamic Scenario: Changing Conditions ===");

  const agentManager = new AgentManager();
  const callManager = new CallManager();

  for (let i = 1; i <= 10; i++) {
    agentManager.addAgent({
      id: `A${i}`,
      name: `Agent ${i}`,
      state: AgentState.AVAILABLE,
    });
  }

  const provider = new UnreliableProvider("dyn-provider", 0.1, 0.1, 100, 0.5);
  const dialer = new ProgressiveDialer(agentManager, callManager, provider);
  const pacing = new PacingEngine(callManager, agentManager);
  const safety = new SafetyController(agentManager, callManager);

  const phases = [
    { answerRate: 0.7, providerHealth: 1.0, note: "Healthy, high answer rate" },
    { answerRate: 0.5, providerHealth: 0.8, note: "Moderate degradation" },
    { answerRate: 0.2, providerHealth: 0.4, note: "Severe degradation" },
  ];

  for (const phase of phases) {
    pacing.updateAnswerRate(phase.answerRate);
    pacing.updateProviderHealth(phase.providerHealth);

    console.log(`\n--- Phase: ${phase.note} ---`);
    console.log(`   Answer rate: ${(phase.answerRate * 100).toFixed(0)}%`);
    console.log(
      `   Provider health: ${(phase.providerHealth * 100).toFixed(0)}%`,
    );

    const rec = pacing.analyze();
    const dec = safety.evaluate(rec.recommendedCalls, true);

    console.log(`   Pacing recommendation: ${rec.recommendedCalls} calls`);
    console.log(
      `   Safety decision: ${dec.approved ? "APPROVED" : "REJECTED"} (${dec.approvedCalls} calls)`,
    );
    console.log(`   Reason: ${dec.reason}`);
    console.log(`   Reasoning: ${rec.reasoning.join(" | ")}`);

    // Actually dial to update state for next phase
    const borrowers = Array.from(
      { length: dec.approvedCalls },
      (_, i) => `DynB-${phase.answerRate}-${i}`,
    );
    await dialer.dialProgressive(borrowers);

    // Short wait to let some transitions occur
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Cleanup stale agents (short timeout for demo)
    const cleanup = new TimeoutCleanup(agentManager, callManager, 2000);
    cleanup.cleanup();
  }
}

async function runAllScenarios() {
  const scenarios: Scenario[] = [
    {
      name: "A - Low answer rate",
      answerRate: 0.2,
      avgTalkTime: 120,
      agents: 5,
      borrowers: 10,
      providerType: "fast",
    },
    {
      name: "B - Medium answer rate",
      answerRate: 0.5,
      avgTalkTime: 90,
      agents: 5,
      borrowers: 10,
      providerType: "fast",
    },
    {
      name: "C - High answer rate",
      answerRate: 0.7,
      avgTalkTime: 180,
      agents: 5,
      borrowers: 10,
      providerType: "fast",
    },
    {
      name: "D - Unreliable provider",
      answerRate: 0.5,
      avgTalkTime: 120,
      agents: 5,
      borrowers: 10,
      providerType: "unreliable",
    },
  ];

  const results = [];
  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);
  }

  console.log("\n=== Summary Table ===");
  console.table(
    results.map((r) => ({
      Scenario: r.scenario.name,
      Dialed: r.dialed,
      Failed: r.failed,
      Answered: r.answered,
      Completed: r.completed,
      Waiting: r.waiting,
      AvailableAgents: r.availableAgents,
      DurationSec: r.duration.toFixed(1),
    })),
  );

  // ✅ Run the dynamic scenario
  await runDynamicScenario();
}

runAllScenarios().catch(console.error);
