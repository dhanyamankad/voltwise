# VoltWise — Adaptive EV Charging for a Renewable-Powered Grid

HackOut'26 | Team ByteSized Brains

## Structure

- `frontend/` — React + Vite + Tailwind (Driver & Operator UI)
- `backend/` — FastAPI (API, WebSocket, DB, orchestration)
  - `backend/app/scheduler/` — optimization engine
  - `backend/app/forecasting/` — weather signal + simulation
- `deploy/` — deployment configs + demo runbook
- `docs/` — API contract + one PRD per work track

## Start here

1. Read `docs/00-API-Contract.md` — the shared data shapes everyone builds against.
2. Read your own `docs/PRD-0X-*.md` — your scope, task checklist, and file ownership.
3. Read `docs/INTEGRATION-GUIDE.md` — the timeline and how the four tracks come back together.

## Branches

| Branch | Owner | Track | PRD |
|---|---|---|---|
| `dhanya` | Dhanya Mankad | Frontend — Driver & Operator UI | `docs/PRD-01-Frontend.md` |
| `rutvi` | Rutvi Kariya | Backend — API, WebSocket, DB | `docs/PRD-02-Backend-API.md` |
| `tanvi` | Tanvi Kariya | Scheduler — Optimization engine | `docs/PRD-03-Scheduler.md` |
| `vanshi` | Vanshi Davda | Forecasting, Simulation, Deployment | `docs/PRD-04-Forecasting-Simulation.md` |

`main` is protected — merge via small, frequent PRs from your branch, not one big merge at the end.
