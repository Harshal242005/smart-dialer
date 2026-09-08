import { AgentManager } from "./agents/AgentManager";
import { AgentState } from "./models/agent";
import { CallManager } from "./calls/CallManager";
import { ProgressiveDialer } from "./dialer/ProgressiveDialer";
import { MockProvider } from "./providers/MockProvider";

// Simulate a worker that crashes mid-call
async function crashableWorker(
    workerId: string,
    ipAddress: string,
    agentManager: AgentManager,
    callManager: CallManager,
    borrowerIds: string[],
    shouldCrash: boolean = false
) {
    const provider = new MockProvider(`provider-${workerId}`, 0.1, 100, 0.5);
    const dialer = new ProgressiveDialer(agentManager, callManager, provider);
    
    try {
        const result = await dialer.dialProgressive(borrowerIds);
        
        // Simulate worker crash after some calls
        if (shouldCrash && result.dialed > 0) {
            console.log(`[${workerId} @ ${ipAddress}] 💥 WORKER CRASHED after ${result.dialed} calls!`);
            // Don't clean up - simulate crash
            throw new Error(`Worker ${workerId} crashed!`);
        }
        
        return result;
    } catch (error) {
        // Worker crashed - agents/calls stay in reserved state
        console.log(`[${workerId} @ ${ipAddress}] ⚠️ Worker failed:`, error.message);
        return { dialed: 0, failed: borrowerIds.length, results: [] };
    }
}

async function testFailureRecovery() {
    console.log("=== Failure Recovery Test ===");
    console.log("Testing what happens when workers crash on different IPs\n");

    const agentManager = new AgentManager();
    const callManager = new CallManager();

    // Add 3 agents
    for (let i = 1; i <= 3; i++) {
        agentManager.addAgent({
            id: `A${i}`,
            name: `Agent ${i}`,
            state: AgentState.AVAILABLE
        });
    }
    console.log(`Added ${agentManager.getAvailableAgents().length} agents\n`);

    // Worker 1: Crashes mid-call
    console.log("Worker 1 (192.168.1.100) - will crash...");
    const worker1Result = await crashableWorker(
        "Worker-1", 
        "192.168.1.100",
        agentManager, 
        callManager,
        ["B1", "B2", "B3"],
        true // Should crash
    );

    // Worker 2: Normal worker
    console.log("\nWorker 2 (192.168.1.101) - normal operation...");
    const worker2Result = await crashableWorker(
        "Worker-2",
        "192.168.1.101", 
        agentManager, 
        callManager,
        ["B4", "B5", "B6"],
        false
    );

    console.log("\n=== After Crash - System State ===");
    console.log("Agent states:");
    for (let i = 1; i <= 3; i++) {
        const agent = agentManager.getAgent(`A${i}`);
        if (agent) {
            console.log(`  ${agent.name}: ${agent.state}`);
        }
    }

    console.log("\nCall states:");
    callManager.getActiveCalls().forEach(call => {
        console.log(`  ${call.id}: ${call.state} (Agent: ${call.agentId || 'none'})`);
    });

    // Simulate recovery (timeout cleanup)
    console.log("\n=== Recovery Mechanism ===");
    console.log("Checking for stale reservations...");
    
    const staleAgents = [];
    const now = Date.now();
    const timeoutMs = 30000;

    for (let i = 1; i <= 3; i++) {
        const agent = agentManager.getAgent(`A${i}`);
        if (agent && (agent.state === AgentState.RESERVED || agent.state === AgentState.DIALING)) {
            // In production, would check timestamp
            console.log(`  Agent ${agent.name} is ${agent.state} - waiting for recovery`);
            staleAgents.push(agent);
        }
    }

    console.log(`\n✅ Recovery would release ${staleAgents.length} stale agent(s) after timeout`);
    console.log("✅ System would then make these agents AVAILABLE again");
}

testFailureRecovery().catch(console.error);
