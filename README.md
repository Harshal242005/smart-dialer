# SmartDialer – Predictive Dialing Simulator

A TypeScript‑based call centre dialer that balances **high agent utilisation** with **safety**, ensuring that you never connect more borrowers than available agents can handle.

This project was built as a systems‑design and coding assignment. It demonstrates:

- Concurrency‑safe atomic reservations  
- Agent and call state machines  
- Progressive and predictive dialing  
- A Safety Controller that acts as the final gatekeeper  
- Two mock telecom providers (fast & unreliable)  
- Simulation scenarios with different answer rates and talk times  

---

## 📦 Features

| Feature | Description |
|---------|-------------|
| **Progressive Dialer** | Safe baseline – dials exactly one call per available agent. |
| **Predictive Pacing Engine** | Calculates how many calls to attempt based on answer rate, capacity, and safety margin. *Never places calls directly.* |
| **Safety Controller** | Final authority – can approve, reduce, reject, or fall back to progressive dialing. Prevents over‑dialing. |
| **Agent State Machine** | `OFFLINE → AVAILABLE → RESERVED → DIALING → CONNECTED → WRAP_UP → AVAILABLE` with valid transitions. |
| **Call State Machine** | `QUEUED → RESERVED → INITIATED → RINGING → ANSWERED → CONNECTED → COMPLETED` (plus `FAILED`, `CANCELLED`). |
| **Atomic Reservation** | Prevents two workers from grabbing the same agent – built‑in concurrency safety. |
| **Two Mock Providers** | `FastProvider` (reliable, fast) and `UnreliableProvider` (slow, timeouts, duplicates, high failure). |
| **Simulation Runner** | Runs predefined scenarios (A–D) with varying answer rates and talk times, collecting metrics. |
| **Multi‑worker & Load Tests** | Demonstrate that the system scales and stays safe under concurrent load. |

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install