
---

## 📄 `architecture-decision.md`

```markdown
# Architecture Decisions

## 1. Progressive Dialer First
- **Why:** Provides a safe baseline. Once it works, we can safely layer predictive logic on top.
- **Benefit:** Ensures we never over‑dial, even if the predictive engine has a bug.

## 2. Separate Safety Controller
- **Why:** Prediction is probabilistic; safety must be deterministic.
- **Result:** The Safety Controller has final authority to approve/reduce/reject calls. The predictive engine cannot bypass it.

## 3. Atomic Reservation (`tryReserveAgent` / `tryReserveCall`)
- **Why:** Multiple workers may attempt to reserve the same agent concurrently.
- **Implementation:** Uses a simple in‑memory Map check; could be replaced with Redis locks in production.

## 4. Idempotent Event Handling
- **Why:** Providers may send duplicate or out‑of‑order events.
- **How:** State transitions are validated – duplicate events are ignored because the transition is not allowed from the current state.

## 5. No Database / Redis / Kafka
- **Why:** This is a prototype for a campus recruitment assignment. Unnecessary complexity would obscure the core logic.
- **Future:** For production, we'd add persistent storage, distributed coordination (Redis), and message queues.

## 6. TypeScript over JavaScript
- **Why:** Type safety reduces runtime errors, especially with state machines. Easier to reason about valid transitions.
- **Benefit:** The compiler catches invalid state changes early.

## 7. Two Distinct Providers (Fast & Unreliable)
- **Why:** Demonstrates that the dialer can handle both reliable and faulty external systems.
- **UnreliableProvider** simulates timeouts, failures, and duplicates – proving the dialer's resilience.