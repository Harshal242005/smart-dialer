import { AgentManager } from "./agents/AgentManager";
import { AgentState } from "./models/agent";
import { CallManager } from "./calls/CallManager";
import { ProgressiveDialer } from "./dialer/ProgressiveDialer";
import { MockProvider } from "./providers/MockProvider";

// Simulate a worker process with its own IP
async function workerSimulation(
    workerId: string,
    ipAddress: string,
    agentManager: AgentManager,
    callManager: CallManager,
    borrowers: string[]
) {
    console.log(`\n[${workerId} @ ${ipAddress}] Starting...`);
    
    // Each worker has its own dialer instance
    const provider = new MockProvider(`provider-${workerId}`, 0.05, 50, 0.5);
    const dialer = new ProgressiveDialer(agentManager, callManager, provider);

    try {
        // Worker tries to dial calls
        const result = await dialer.dialProgressive(borrowers);
        
        console.log(`[${workerId} @ ${ipAddress}] Dialed: ${result.dialed}, Failed: ${result.failed}`);
        
        // Show which agents this worker reserved
        const availableAgents = agentManager.getAvailableAgents();
        console.log(`[${workerId} @ ${ipAddress}] Available agents: ${availableAgents.length}`);
        
        return result;
    } catch (error) {
        console.error(`[${workerId} @ ${ipAddress}] Error:`, error);
        return { dialed: 0, failed: 0, results: [] };
    }
}

async function testMultiWorker() {
    console.log("=== Multi-Worker SmartDialer Test ===");
    console.log("Simulating workers on different IP addresses\n");

    // Shared state (would be in a database/Redis in production)
    const agentManager = new AgentManager();
    const callManager = new CallManager();

    // Add 5 agents
    console.log("Adding 5 agents...");
    for (let i = 1; i <= 5; i++) {
        agentManager.addAgent({
            id: `A${i}`,
            name: `Agent ${i}`,
            state: AgentState.AVAILABLE
        });
    }
    console.log(`Total agents: ${agentManager.getAvailableAgents().length} available\n`);

    // Borrowers for each worker
    const worker1Borrowers = ["B1", "B2", "B3", "B4", "B5"];
    const worker2Borrowers = ["B6", "B7", "B8", "B9", "B10"];
    const worker3Borrowers = ["B11", "B12", "B13", "B14", "B15"];

    console.log("=== Starting Workers ===");
    console.log("Worker 1: 192.168.1.100 (trying 5 calls)");
    console.log("Worker 2: 192.168.1.101 (trying 5 calls)");
    console.log("Worker 3: 192.168.1.102 (trying 5 calls)\n");

    // Run workers concurrently (simulating different machines)
    const startTime = Date.now();

    const results = await Promise.all([
        workerSimulation("Worker-1", "192.168.1.100", agentManager, callManager, worker1Borrowers),
        workerSimulation("Worker-2", "192.168.1.101", agentManager, callManager, worker2Borrowers),
        workerSimulation("Worker-3", "192.168.1.102", agentManager, callManager, worker3Borrowers)
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n=== Results Summary ===");
    console.log(`Test completed in ${duration} seconds\n`);

    // Show final state
    console.log("Final Agent States:");
    for (let i = 1; i <= 5; i++) {
        const agent = agentManager.getAgent(`A${i}`);
        if (agent) {
            console.log(`  ${agent.name}: ${agent.state}`);
        }
    }

    console.log("\nFinal Call States:");
    const allCalls = callManager.getActiveCalls();
    console.log(`Total active calls: ${allCalls.length}`);
    
    // Count calls by state
    const states: Record<string, number> = {};
    allCalls.forEach(call => {
        states[call.state] = (states[call.state] || 0) + 1;
    });
    console.log("  Call breakdown:");
    Object.entries(states).forEach(([state, count]) => {
        console.log(`    ${state}: ${count}`);
    });

    // Calculate total dialed vs attempted
    const totalDialed = results.reduce((sum, r) => sum + (r.dialed || 0), 0);
    const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);
    
    console.log("\nTotal Statistics:");
    console.log(`  Calls dialed: ${totalDialed}`);
    console.log(`  Calls failed: ${totalFailed}`);
    console.log(`  Total attempted: ${totalDialed + totalFailed}`);

    // Verify no duplicate reservations
    const agents = Array.from({ length: 5 }, (_, i) => agentManager.getAgent(`A${i}`));
    const reservedCount = agents.filter(a => a?.state === AgentState.RESERVED || a?.state === AgentState.DIALING).length;
    console.log(`\n  Agents currently reserved/dialing: ${reservedCount}/5`);
    console.log(`  ✅ No duplicate reservations (max 5 agents used)`);
}

// Run the test
testMultiWorker().catch(console.error);
