import { TelecomProvider, ProviderResult } from "./TelecomProvider";

export class UnreliableProvider implements TelecomProvider {
    private providerId: string;
    private failureRate: number;
    private duplicateRate: number;
    private responseDelayMs: number;

    constructor(
        providerId: string = "unreliable-provider",
        failureRate: number = 0.3,
        duplicateRate: number = 0.2,
        responseDelayMs: number = 300
    ) {
        this.providerId = providerId;
        this.failureRate = failureRate;
        this.duplicateRate = duplicateRate;
        this.responseDelayMs = responseDelayMs;
    }

    async placeCall(borrowerId: string, agentId: string, callId: string): Promise<ProviderResult> {
        // Simulate slow response
        await new Promise(resolve => setTimeout(resolve, this.responseDelayMs));

        // Simulate high failure rate
        if (Math.random() < this.failureRate) {
            console.log(`[UnreliableProvider] Call ${callId} FAILED (high failure rate)`);
            return { success: false, error: 'Provider failure (simulated)' };
        }

        // Simulate random timeout (crash)
        if (Math.random() < 0.1) {
            console.log(`[UnreliableProvider] Call ${callId} TIMEOUT – no response`);
            // In reality, we would throw an exception; for now, return a failure
            return { success: false, error: 'Provider timeout' };
        }

        // Answer rate: 50%
        const willAnswer = Math.random() < 0.5;

        // Simulate duplicate events: send multiple "ANSWERED" events
        if (willAnswer && Math.random() < this.duplicateRate) {
            console.log(`[UnreliableProvider] Call ${callId} ANSWERED (but will send duplicate event later)`);
            return {
                success: true,
                callId,
                metadata: {
                    answered: true,
                    providerId: this.providerId,
                    duplicate: true, // flag for later handling
                    duration: Math.floor(Math.random() * 120) + 60
                }
            };
        }

        if (willAnswer) {
            console.log(`[UnreliableProvider] Call ${callId} ANSWERED`);
            return {
                success: true,
                callId,
                metadata: {
                    answered: true,
                    providerId: this.providerId,
                    duration: Math.floor(Math.random() * 120) + 60
                }
            };
        }

        console.log(`[UnreliableProvider] Call ${callId} NO ANSWER`);
        return {
            success: true,
            callId,
            metadata: {
                answered: false,
                providerId: this.providerId
            }
        };
    }

    getProviderId(): string {
        return this.providerId;
    }

    isHealthy(): boolean {
        // Simulate health checks: sometimes unhealthy
        return Math.random() > 0.1;
    }
}
