export interface ProviderResult {
  success: boolean;
  callId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TelecomProvider {
  placeCall(
    borrowerId: string,
    agentId: string,
    callId: string,
  ): Promise<ProviderResult>;
  getProviderId(): string;
  isHealthy(): boolean;
}
