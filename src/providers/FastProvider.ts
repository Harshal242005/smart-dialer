import { TelecomProvider, ProviderResult } from "./TelecomProvider";

export class FastProvider implements TelecomProvider {
    private providerId: string;

    constructor(providerId: string = "fast-provider") {
        this.providerId = providerId;
    }

    async placeCall(borrowerId: string, agentId: string, callId: string): Promise<ProviderResult> {
        // Fast response (50ms)
        await new Promise(resolve => setTimeout(resolve, 50));

        console.log(`[FastProvider] Call ${callId} (borrower ${borrowerId}, agent ${agentId})`);

        // High answer rate (80%), low failure (2%)
        const rand = Math.random();
        if (rand < 0.02) {
            console.log(`[FastProvider] Call ${callId} FAILED (rare network error)`);
            return { success: false, error: 'Rare network error' };
        }

        const willAnswer = rand < 0.8; // 80% answer rate
        if (!willAnswer) {
            console.log(`[FastProvider] Call ${callId} NO ANSWER`);
            return { success: true, callId, metadata: { answered: false, providerId: this.providerId } };
        }

        console.log(`[FastProvider] Call ${callId} ANSWERED`);
        return {
            success: true,
            callId,
            metadata: {
                answered: true,
                providerId: this.providerId,
                duration: Math.floor(Math.random() * 60) + 30 // 30-90 sec
            }
        };
    }

    getProviderId(): string {
        return this.providerId;
    }

    isHealthy(): boolean {
        return true;
    }
}
