import { TelecomProvider, ProviderResult } from "./TelecomProvider";

export class FastProvider implements TelecomProvider {
  private providerId: string;
  private answerRate: number;

  constructor(providerId: string = "fast-provider", answerRate: number = 0.8) {
    this.providerId = providerId;
    this.answerRate = answerRate;
  }

  async placeCall(
    borrowerId: string,
    agentId: string,
    callId: string,
  ): Promise<ProviderResult> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(
      `[FastProvider] Call ${callId} (borrower ${borrowerId}, agent ${agentId})`,
    );

    const rand = Math.random();
    if (rand < 0.02) {
      console.log(`[FastProvider] Call ${callId} FAILED (rare network error)`);
      return { success: false, error: "Rare network error" };
    }

    const willAnswer = rand < this.answerRate;
    if (!willAnswer) {
      console.log(`[FastProvider] Call ${callId} NO ANSWER`);
      return {
        success: true,
        callId,
        metadata: { answered: false, providerId: this.providerId },
      };
    }

    console.log(`[FastProvider] Call ${callId} ANSWERED`);
    return {
      success: true,
      callId,
      metadata: {
        answered: true,
        providerId: this.providerId,
        duration: Math.floor(Math.random() * 60) + 30,
      },
    };
  }

  getProviderId(): string {
    return this.providerId;
  }

  isHealthy(): boolean {
    return true;
  }
}
