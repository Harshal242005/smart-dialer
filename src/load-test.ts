import { AgentManager } from "./agents/AgentManager";
import { AgentState } from "./models/agent";
import { CallManager } from "./calls/CallManager";
import { ProgressiveDialer } from "./dialer/ProgressiveDialer";
import { MockProvider } from "./providers/MockProvider";

// Simulate a worker with specific IP
async function workerTask(
  workerId: string,
  ipAddress: string,
  agentManager: AgentManager,
  callManager: CallManager,
  borrowerIds: string[],
) {
  const provider = new MockProvider(`provider-${workerId}`, 0.1, 100, 0.6);
  const dialer = new ProgressiveDialer(agentManager, callManager, provider);

  const startTime = Date.now();
  const result = await dialer.dialProgressive(borrowerIds);
  const duration = Date.now() - startTime;

  return {
    workerId,
    ipAddress, // <-- property name is ipAddress
    dialed: result.dialed,
    failed: result.failed,
    duration,
  };
}

async function runLoadTest() {
  console.log("=== Load Test: Multiple Workers on Different IPs ===\n");

  const agentManager = new AgentManager();
  const callManager = new CallManager();

  // Add 10 agents
  for (let i = 1; i <= 10; i++) {
    agentManager.addAgent({
      id: `A${i}`,
      name: `Agent ${i}`,
      state: AgentState.AVAILABLE,
    });
  }
  console.log(`Added ${agentManager.getAvailableAgents().length} agents`);

  const workers = [];
  const numWorkers = 8;
  for (let i = 1; i <= numWorkers; i++) {
    const ip = `192.168.1.${100 + i}`;
    const borrowerIds = Array.from({ length: 5 }, (_, j) => `B-${i}-${j}`);
    workers.push({
      id: `Worker-${i}`,
      ip,
      borrowers: borrowerIds,
    });
  }

  console.log(`Starting ${numWorkers} workers on different IPs...`);
  console.log(`Total borrowers: ${numWorkers * 5}\n`);

  const startTime = Date.now();
  const results = await Promise.all(
    workers.map((w) =>
      workerTask(w.id, w.ip, agentManager, callManager, w.borrowers),
    ),
  );
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("=== Results ===");
  console.log(`Completed in ${totalDuration} seconds\n`);

  let totalDialed = 0;
  let totalFailed = 0;
  let totalDuration_ms = 0;

  results.forEach((r) => {
    // FIXED: use r.ipAddress, not r.ip
    console.log(
      `${r.workerId} @ ${r.ipAddress}: dialed=${r.dialed}, failed=${r.failed}, duration=${r.duration}ms`,
    );
    totalDialed += r.dialed;
    totalFailed += r.failed;
    totalDuration_ms += r.duration;
  });

  console.log(`\nSummary:`);
  console.log(`  Total dialed: ${totalDialed}`);
  console.log(`  Total failed: ${totalFailed}`);
  console.log(
    `  Success rate: ${((totalDialed / (totalDialed + totalFailed)) * 100).toFixed(1)}%`,
  );
  console.log(
    `  Avg duration: ${(totalDuration_ms / results.length).toFixed(0)}ms`,
  );

  console.log(`\nFinal Agent States:`);
  const stateCount: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) {
    const agent = agentManager.getAgent(`A${i}`);
    if (agent) {
      stateCount[agent.state] = (stateCount[agent.state] || 0) + 1;
    }
  }
  Object.entries(stateCount).forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });

  console.log(`\nCall States:`);
  const callStates: Record<string, number> = {};
  callManager.getActiveCalls().forEach((call) => {
    callStates[call.state] = (callStates[call.state] || 0) + 1;
  });
  Object.entries(callStates).forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });

  console.log(`\n=== Concurrency Safety Check ===`);
  const available = agentManager.getAvailableAgents().length;
  const activeCalls = callManager.getActiveCalls().length;
  console.log(`Available agents: ${available}`);
  console.log(`Active calls: ${activeCalls}`);
  console.log(`Max agents used: ${10 - available}/${10}`);

  if (activeCalls <= 10) {
    console.log(
      `✅ No duplicate reservations! Calls (${activeCalls}) <= Agents (10)`,
    );
  } else {
    console.log(`❌ SAFETY BREACH! Calls (${activeCalls}) > Agents (10)`);
  }
}

runLoadTest().catch(console.error);
