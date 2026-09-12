# VoltWise — Scheduling & Optimization Engine

**Owner:** Tanvi Kariya  
**Branch:** `tanvi`  
**Package:** `backend/app/scheduler`

The VoltWise Scheduling Engine coordinates EV charging requests across 2 station ports while optimizing for grid renewable availability, energy costs, and carbon emissions.

---

## Hard Constraints (Non-Negotiable)

1. **Port Capacity**: Maximum 1 EV charging on a given port at any time slot.
2. **Deadline Guarantee**: Charging sessions must complete on or before the requested vehicle deadline.
3. **Priority Protection**: Critical operational vehicles (`vehicle_class: "priority"` — e.g. ambulances, emergency services, ride-share fleet) are scheduled first and locked. They are never displaced or moved during re-optimization.
4. **Power & Rate Limits**: Charging rate is capped by `min(charging_rate_kw, port_power_limit_kw)`.

---

## Soft Objectives & Weightings

For flexible sessions, window selection evaluates candidate time slots based on driver preference:

- **`"greenest"`**: Maximize average `renewable_score` (solar + wind signal).
- **`"cheapest"`**: Minimize total estimated energy cost based on dynamic price index `price_signal`.
- **`"balanced"`**: $0.6 \times \text{renewable\_score} + 0.4 \times (100 - \text{price\_signal})$.

---

## Core Functions

Matching `docs/00-API-Contract.md` §4:

### `build_schedule(requests, ports, signal) -> list[Session]`
Generates feasible, optimized charging sessions for incoming requests.

### `reoptimize(current_sessions, updated_signal) -> list[Session]`
Triggered when renewable grid conditions drop or fluctuate. Re-evaluates flexible sessions and returns **only** the sessions that changed. Priority or active sessions are untouched.

---

## Running Unit Tests & Fixtures

To run the complete test suite:

```bash
python -m unittest backend/app/scheduler/test_scheduler.py
```
