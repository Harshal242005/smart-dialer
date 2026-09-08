import { CallManager } from "../calls/CallManager";
import { CallState } from "../models/call";
import { AgentManager } from "../agents/AgentManager";

export interface PacingMetrics {
  availableAgents: number;
  connectedCalls: number;
  ringingCalls: number;
  totalActiveCalls: number;
  historicalAnswerRate: number;
  historicalAbandonRate: number;
  averageTalkTimeSeconds: number;
  providerHealth: number; // 0-1
  safetyMargin: number; // 0-1, higher = more conservative
}

export interface PacingRecommendation {
  recommendedCalls: number;
  confidence: number; // 0-1
  reasoning: string[];
  metrics: PacingMetrics;
}

export class PacingEngine {
  private callManager: CallManager;
  private agentManager: AgentManager;

  // Historical metrics (would normally be tracked over time)
  private historicalAnswerRate: number = 0.5; // 50% default
  private historicalAbandonRate: number = 0.05; // 5% default
  private averageTalkTimeSeconds: number = 120;
  private providerHealth: number = 1.0;
  private safetyMargin: number = 0.8; // Conservative by default

  constructor(callManager: CallManager, agentManager: AgentManager) {
    this.callManager = callManager;
    this.agentManager = agentManager;
  }

  /**
   * Calculate the recommended number of calls to dial
   * This is the "brain" of predictive dialing
   */
  analyze(): PacingRecommendation {
    const metrics = this.gatherMetrics();
    const reasoning: string[] = [];

    // 1. Calculate available capacity
    const availableCapacity =
      metrics.availableAgents - metrics.connectedCalls - metrics.ringingCalls;
    reasoning.push(
      `Available capacity: ${availableCapacity} (${metrics.availableAgents} agents - ${metrics.connectedCalls} connected - ${metrics.ringingCalls} ringing)`,
    );

    if (availableCapacity <= 0) {
      reasoning.push("No available capacity, recommending 0 calls");
      return {
        recommendedCalls: 0,
        confidence: 1.0,
        reasoning,
        metrics,
      };
    }

    // 2. Calculate how many calls we need to start to fill capacity
    // Formula: capacity / answer_rate * safety_margin
    const rawPrediction = availableCapacity / metrics.historicalAnswerRate;
    reasoning.push(
      `Raw prediction: ${rawPrediction.toFixed(1)} calls (${availableCapacity} capacity / ${(metrics.historicalAnswerRate * 100).toFixed(0)}% answer rate)`,
    );

    // 3. Apply safety margin (make more conservative)
    const withSafetyMargin = rawPrediction * metrics.safetyMargin;
    reasoning.push(
      `With safety margin: ${withSafetyMargin.toFixed(1)} calls (× ${(metrics.safetyMargin * 100).toFixed(0)}% safety margin)`,
    );

    // 4. Apply provider health adjustment
    const withHealthAdjustment = withSafetyMargin * metrics.providerHealth;
    reasoning.push(
      `With health adjustment: ${withHealthAdjustment.toFixed(1)} calls (provider health: ${(metrics.providerHealth * 100).toFixed(0)}%)`,
    );

    // 5. Round and cap
    let recommended = Math.round(withHealthAdjustment);

    // Never exceed available agents
    if (recommended > metrics.availableAgents) {
      reasoning.push(
        `Capping at ${metrics.availableAgents} (available agents)`,
      );
      recommended = metrics.availableAgents;
    }

    // Never go negative
    if (recommended < 0) {
      reasoning.push("Negative recommendation, setting to 0");
      recommended = 0;
    }

    // 6. Calculate confidence
    const confidence = this.calculateConfidence(metrics);

    return {
      recommendedCalls: recommended,
      confidence,
      reasoning,
      metrics,
    };
  }

  private gatherMetrics(): PacingMetrics {
    const availableAgents = this.agentManager.getAvailableAgents().length;
    const allCalls = this.callManager.getActiveCalls();

    const connectedCalls = allCalls.filter(
      (c) => c.state === CallState.CONNECTED,
    ).length;
    const ringingCalls = allCalls.filter(
      (c) => c.state === CallState.RINGING || c.state === CallState.ANSWERED,
    ).length;
    const totalActiveCalls = allCalls.length;

    return {
      availableAgents,
      connectedCalls,
      ringingCalls,
      totalActiveCalls,
      historicalAnswerRate: this.historicalAnswerRate,
      historicalAbandonRate: this.historicalAbandonRate,
      averageTalkTimeSeconds: this.averageTalkTimeSeconds,
      providerHealth: this.providerHealth,
      safetyMargin: this.safetyMargin,
    };
  }

  private calculateConfidence(metrics: PacingMetrics): number {
    // More data = higher confidence
    let confidence = 0.7; // Base confidence

    // Adjust based on available capacity
    if (metrics.availableAgents > 10) {
      confidence += 0.1;
    }

    // Adjust based on historical data quality
    if (
      metrics.historicalAnswerRate > 0.1 &&
      metrics.historicalAnswerRate < 0.9
    ) {
      confidence += 0.1;
    }

    // Adjust based on provider health
    if (metrics.providerHealth > 0.9) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // Methods to update historical metrics (would be called during simulation)
  updateAnswerRate(rate: number): void {
    this.historicalAnswerRate = Math.max(0, Math.min(1, rate));
  }

  updateAbandonRate(rate: number): void {
    this.historicalAbandonRate = Math.max(0, Math.min(1, rate));
  }

  updateTalkTime(seconds: number): void {
    this.averageTalkTimeSeconds = Math.max(10, seconds);
  }

  updateProviderHealth(health: number): void {
    this.providerHealth = Math.max(0, Math.min(1, health));
  }

  updateSafetyMargin(margin: number): void {
    this.safetyMargin = Math.max(0, Math.min(1, margin));
  }
}
