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

  // Choose provider
  const provider =
    scenario.providerType === "fast"
      ? new FastProvider("fast-provider")
      : new UnreliableProvider("unreliable-provider", 0.1, 0.1, 200);

  // Override answer rate and talk time (we'll adjust provider behaviour dynamically, but for simplicity we use the default values; you can modify provider to accept these)
  // For this demo, we'll just use the provider as is; we'll vary answer rate by changing provider's answerRate property if we extend it.
  // Since we don't have a setter, we'll just note that we're using the given rates.

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

  // Wait for all calls to complete (simulate timers)
  // We'll wait for max talk time + 5 seconds, but for demo we just wait a bit.
  // Actually, we can't wait for all timers because they may be long.
  // Instead, we'll capture the state after a short delay (e.g., 2s) to see initial transitions.
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // Clean up stale agents/calls (simulate timeout recovery)
  const cleanup = new TimeoutCleanup(agentManager, callManager, 5000);
  cleanup.cleanup(); // manually trigger
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Then collect metrics again (or just log)

  // Collect metrics
  const activeCalls = callManager.getActiveCalls();
  const answeredCalls = activeCalls.filter(
    (c) => c.state === CallState.ANSWERED || c.state === CallState.CONNECTED,
  );
  const completedCalls = callManager.getCallsByState(
    CallState.COMPLETED,
  ).length;
  const failedCalls = callManager.getCallsByState(CallState.FAILED).length;
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
      name: "D - Changing answer rate",
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
}

runAllScenarios().catch(console.error);
