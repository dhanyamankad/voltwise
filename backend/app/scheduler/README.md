# VoltWise — Scheduling & Optimization Engine

**Track 03 (Tanvi Kariya)** — Core Optimization Engine for VoltWise AI EV Charging Orchestrator (`backend/app/scheduler`).

The VoltWise Scheduling Engine coordinates EV charging requests across 2 station ports while optimizing for grid renewable availability, energy costs, and carbon emissions in compliance with `docs/00-API-Contract.md` §4 and `docs/PRD-03-Scheduler.md`.

---

## 🔒 Hard Constraints (Non-Negotiable)

1. **Port Capacity**: Maximum 1 EV charging on a given port during any time slot (Port 1 max 50 kW, Port 2 max 100 kW).
2. **Deadline Guarantee**: Charging sessions must complete on or before the requested vehicle deadline.
3. **Priority Protection**: Critical operational vehicles (`vehicle_class: "priority"` — e.g. ambulances, emergency response, ride-share fleets) are scheduled first and locked. They are **never** displaced or moved during re-optimization.
4. **Power & Rate Limits**: Effective charging rate is capped by $\min(\text{charging\_rate\_kw}, \text{port\_power\_limit\_kw})$.

---

## 🎯 Soft Objectives & Driver Preferences

For flexible sessions (`vehicle_class: "normal"`), window selection evaluates candidate time slots based on driver preference:

- **`"greenest"`**: Maximize average `renewable_score` (solar + wind signal).
- **`"cheapest"`**: Minimize total estimated energy cost based on dynamic `price_signal`.
- **`"balanced"`**: Weighted score: $0.6 \times \text{renewable\_score} + 0.4 \times (100 - \text{price\_signal})$.

---

## ⚙️ Core Engine Functions

### 1. `build_schedule(requests, ports, signal) -> list[Session]`
Generates feasible, optimal charging sessions for incoming requests:
- Filters out invalid requests (e.g. `current_soc >= target_soc`).
- Assigns priority requests first to guarantee deadline completion.
- Evaluates candidate time slots for flexible requests against driver preferences.

### 2. `reoptimize(current_sessions, updated_signal) -> list[Session]`
Triggered when renewable grid conditions fluctuate or drop:
- Keeps active sessions and locked priority sessions untouched.
- Re-evaluates flexible pending sessions against the updated signal.
- Returns **only** the sessions that changed to minimize churn.

---

## 🧪 Unit Tests & Verification

To execute the unit test suite:

```bash
python -m unittest backend/app/scheduler/test_scheduler.py
```

### Test Cases Covered
- `test_priority_override`: Verifies critical ambulances are assigned immediately and locked.
- `test_deadline_feasibility`: Ensures requests exceeding feasible deadline limits are handled gracefully.
- `test_reoptimize_on_solar_drop`: Verifies flexible sessions are shifted to cleaner windows when a solar drop occurs.
- `test_invalid_soc`: Validates that `current_soc > target_soc` requests are rejected.
