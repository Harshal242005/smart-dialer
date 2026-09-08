import { TelecomProvider, ProviderResult } from "./TelecomProvider";

export class MockProvider implements TelecomProvider {
  private providerId: string;
  private failureRate: number;
  private responseDelayMs: number;
  private answerRate: number;

  constructor(
    providerId: string = "mock-provider",
    failureRate: number = 0.1,
    responseDelayMs: number = 100,
    answerRate: number = 0.7,
  ) {
    this.providerId = providerId;
    this.failureRate = failureRate;
    this.responseDelayMs = responseDelayMs;
    this.answerRate = answerRate;
  }

  async placeCall(
    borrowerId: string,
    agentId: string,
    callId: string,
  ): Promise<ProviderResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, this.responseDelayMs));

    // Log the call attempt (using the parameters so they're not unused)
    console.log(
      `[MockProvider] Attempting call: borrower=${borrowerId}, agent=${agentId}, call=${callId}`,
    );

    // Simulate failures
    if (Math.random() < this.failureRate) {
      console.log(`[MockProvider] Call ${callId} FAILED (simulated failure)`);
      return {
        success: false,
        error: "Provider call failed (simulated)",
      };
    }

    // Simulate answer rate
    const willAnswer = Math.random() < this.answerRate;

    console.log(
      `[MockProvider] Call ${callId} ${willAnswer ? "ANSWERED" : "NO ANSWER"}`,
    );

    return {
      success: true,
      callId: callId,
      metadata: {
        answered: willAnswer,
        providerId: this.providerId,
        duration: Math.floor(Math.random() * 120) + 30, // 30-150 seconds
        borrowerId: borrowerId,
        agentId: agentId,
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
