# VoltWise — Shared API Contract

**This file is the single source of truth for data shapes and endpoints.**
All four tracks build against this. If you need to change something here, post
in the team chat first — a change here breaks someone else's branch.

Status: 🔒 Locked for Day 1 morning. Only edit with team agreement.

---

## 1. Core Data Models

```typescript
// An incoming charging request from a driver
interface EVRequest {
  id: string;
  vehicle_class: "normal" | "priority";   // priority = ambulance/fleet/delivery
  current_soc: number;                    // 0-100 (%)
  target_soc: number;                     // 0-100 (%)
  deadline: string;                       // ISO 8601 datetime, "ready by"
  charging_rate_kw: number;               // vehicle's max charge rate
  preference: "balanced" | "cheapest" | "greenest";
  created_at: string;                     // ISO 8601
}

// A scheduled/active/completed charging session
interface Session {
  id: string;
  ev_id: string;
  port_id: "port_1" | "port_2";
  start_time: string;                     // ISO 8601
  end_time: string;                       // ISO 8601
  status: "scheduled" | "charging" | "completed" | "moved" | "cancelled";
  price_estimate: number;                 // currency units
  green_score: number;                    // 0-100
  co2_estimate_kg: number;
  reason: string;                         // human-readable explanation, e.g.
                                           // "Scheduled at 15:15 — 78% renewable, low grid stress"
  version: number;                        // increment every time this session is rescheduled
}

// Port state
interface Port {
  id: "port_1" | "port_2";
  status: "idle" | "occupied";
  power_limit_kw: number;
  current_session_id: string | null;
}

// Hourly renewable/energy signal for the demo city
interface RenewableSignal {
  timestamp: string;                      // ISO 8601, hourly
  solar_irradiance: number;               // W/m²
  wind_speed: number;                     // m/s
  temperature: number;                    // °C
  renewable_score: number;                // 0-100, derived
  price_signal: number;                   // relative price index
  carbon_intensity: number;               // relative carbon index
}

// Pushed over WebSocket when a flexible session gets rescheduled
interface PlanChangedEvent {
  type: "plan_changed";
  session_id: string;
  old_window: { start: string; end: string };
  new_window: { start: string; end: string };
  reason: string;
  timestamp: string;
}

// Full station snapshot (operator dashboard)
interface StationState {
  ports: Port[];
  active_sessions: Session[];
  pending_requests: EVRequest[];
  current_signal: RenewableSignal;
}
```

---

## 2. REST Endpoints (FastAPI, prefix `/api`)

| Method | Path | Body | Returns | Owner |
|---|---|---|---|---|
| POST | `/api/ev-requests` | `EVRequest` (no id) | Created `Session` | Backend, calls Scheduler |
| GET | `/api/sessions/{id}` | — | `Session` | Backend |
| GET | `/api/schedule` | — | `StationState` | Backend |
| GET | `/api/renewable-signal?city=` | — | `RenewableSignal[]` (24h) | Forecasting |
| POST | `/api/simulate/renewable-drop` | `{ new_score: number }` | `{ ok: true }` — triggers re-optimization | Forecasting/Sim |

## 3. WebSocket

`ws://<host>/ws/updates`

Server pushes JSON messages of type `PlanChangedEvent` or `{ type: "session_update", session: Session }` whenever the schedule changes. Frontend subscribes once and listens for both types.

## 4. Internal Function Boundary (Scheduler ↔ Backend)

The Scheduler track exposes ONE Python function the backend calls directly (no need for it to be a separate service):

```python
def build_schedule(
    requests: list[EVRequest],
    ports: list[Port],
    signal: list[RenewableSignal],
) -> list[Session]:
    """Returns a full or partial schedule respecting hard constraints
    (deadlines, port availability, priority protection) and optimizing
    for the requested preference using the signal."""
```

And one for re-optimization:

```python
def reoptimize(
    current_sessions: list[Session],
    updated_signal: list[RenewableSignal],
) -> list[Session]:
    """Returns only the sessions that changed. Protected/priority/in-progress
    sessions must never appear in the output."""
```

## 5. Internal Function Boundary (Forecasting ↔ Scheduler/Backend)

```python
def get_renewable_signal(city: str, hours_ahead: int = 24) -> list[RenewableSignal]:
    """Pulls Open-Meteo data, converts to renewable_score/price/carbon.
    Must have a local fallback (canned data) if the API call fails."""

def trigger_renewable_drop(new_score: float) -> None:
    """Simulation hook used by the demo script and the /simulate endpoint."""
```

---

## How to use this file with an AI coding agent

Paste the relevant sections (your PRD + this contract) into your coding agent
as context before starting. If you need a field this contract doesn't have,
add it here, commit, and message the team — don't silently diverge.
