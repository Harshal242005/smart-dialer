import { TelecomProvider, ProviderResult } from "./TelecomProvider";

export class UnreliableProvider implements TelecomProvider {
  private providerId: string;
  private failureRate: number;
  private duplicateRate: number;
  private responseDelayMs: number;
  private answerRate: number;

  constructor(
    providerId: string = "unreliable-provider",
    failureRate: number = 0.3,
    duplicateRate: number = 0.2,
    responseDelayMs: number = 300,
    answerRate: number = 0.5,
  ) {
    this.providerId = providerId;
    this.failureRate = failureRate;
    this.duplicateRate = duplicateRate;
    this.responseDelayMs = responseDelayMs;
    this.answerRate = answerRate;
  }

  async placeCall(
    borrowerId: string,
    agentId: string,
    callId: string,
  ): Promise<ProviderResult> {
    // Simulate slow response
    await new Promise((resolve) => setTimeout(resolve, this.responseDelayMs));

    // Simulate high failure rate
    if (Math.random() < this.failureRate) {
      console.log(
        `[UnreliableProvider] Call ${callId} FAILED (high failure rate)`,
      );
      return { success: false, error: "Provider failure (simulated)" };
    }

    // Simulate random timeout
    if (Math.random() < 0.1) {
      console.log(`[UnreliableProvider] Call ${callId} TIMEOUT – no response`);
      return { success: false, error: "Provider timeout" };
    }

    // Use configured answer rate
    const willAnswer = Math.random() < this.answerRate;

    // Simulate duplicate event flag
    if (willAnswer && Math.random() < this.duplicateRate) {
      console.log(
        `[UnreliableProvider] Call ${callId} ANSWERED (but will send duplicate event later)`,
      );
      return {
        success: true,
        callId,
        metadata: {
          answered: true,
          providerId: this.providerId,
          duplicate: true,
          duration: Math.floor(Math.random() * 120) + 60,
          borrowerId,
          agentId,
        },
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
          duration: Math.floor(Math.random() * 120) + 60,
          borrowerId,
          agentId,
        },
      };
    }

    console.log(`[UnreliableProvider] Call ${callId} NO ANSWER`);
    return {
      success: true,
      callId,
      metadata: {
        answered: false,
        providerId: this.providerId,
        borrowerId,
        agentId,
      },
    };
  }

  getProviderId(): string {
    return this.providerId;
  }

  isHealthy(): boolean {
    return Math.random() > 0.1;
  }
}
