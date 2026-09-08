# Architecture

## High‑Level Design

```mermaid
graph TD
    Campaign --> PacingEngine[Pacing Engine]
    PacingEngine --> SafetyController[Safety Controller]
    SafetyController --> ProgressiveDialer[Progressive Dialer]
    ProgressiveDialer --> TelecomProvider[Telecom Provider]
    ProgressiveDialer --> AgentManager[Agent Manager]
    ProgressiveDialer --> CallManager[Call Manager]