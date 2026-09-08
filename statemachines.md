
---

## 📄 `state-machines.md`

```markdown
# State Machines

## Agent States

```mermaid
graph LR
    OFFLINE --> AVAILABLE
    AVAILABLE --> RESERVED
    AVAILABLE --> PAUSED
    PAUSED --> AVAILABLE
    RESERVED --> DIALING
    RESERVED --> AVAILABLE
    DIALING --> CONNECTED
    DIALING --> AVAILABLE
    CONNECTED --> WRAP_UP
    WRAP_UP --> AVAILABLE