# PRD 02 — Backend API + Realtime + Persistence

**Owner:** Rutvi Kariya
**Branch:** `rutvi`
**Depends on:** `00-API-Contract.md`; calls into Scheduler and Forecasting function boundaries (§4, §5)
**Status:** ⬜ Not Started

> **Instructions for AI coding agent:** As you complete each item in the Task
> Checklist below, check it off (`[x]`) and append a one-line entry to the
> Progress Log at the bottom with a timestamp and what changed. Do not remove
> or reorder existing tasks — add new ones if scope grows. Update the Status
> field at the top to `🟡 In Progress` when you start and `🟢 Done` when the
> Definition of Done is met.

---

## 1. Objective

Own the API surface, session/port state, DB, and WebSocket push described in
`00-API-Contract.md`. You are the integration point — Scheduler and
Forecasting plug into you as Python function calls, not separate services.

## 2. Scope

**In scope:** FastAPI app, all REST endpoints in the contract, WebSocket
broadcast, SQLite persistence, calling the Scheduler and Forecasting
functions, orchestrating re-optimization when a renewable-drop event fires.

**Out of scope:** the optimization algorithm itself (Scheduler track), the
weather pull itself (Forecasting track), any UI.

## 3. What you need from others

- **Scheduler:** `build_schedule()` and `reoptimize()` — until ready, stub
  them with a naive first-come-first-served allocator so your API is testable
  end-to-end from hour one.
- **Forecasting:** `get_renewable_signal()` and `trigger_renewable_drop()` —
  until ready, stub with a hardcoded 24-hour signal array.

Build your stubs to the exact function signatures in `00-API-Contract.md`
§4-§5 so swapping in the real implementations later is a drop-in replacement
(literally just replacing the stub file's contents).

## 4. What you deliver to others

- A running FastAPI server on a fixed port (e.g. `:8000`) that Frontend can
  point at, matching every endpoint and shape in the contract exactly
- A WebSocket endpoint that actually pushes on state change (not polling)

## 5. Task Checklist

- [ ] Scaffold FastAPI project in `backend/`, `uvicorn` running on `:8000`
- [ ] Define Pydantic models mirroring `00-API-Contract.md` §1 exactly
- [ ] SQLite schema + simple ORM/queries for EVRequest, Session, Port
- [ ] Write stub `scheduler_stub.py` (FCFS allocator) matching `build_schedule()` signature
- [ ] Write stub `forecasting_stub.py` (hardcoded signal) matching `get_renewable_signal()` signature
- [ ] `POST /api/ev-requests` — validates, calls scheduler, persists, returns Session
- [ ] `GET /api/sessions/{id}`
- [ ] `GET /api/schedule` — full StationState snapshot
- [ ] `GET /api/renewable-signal` — proxies to forecasting function
- [ ] `POST /api/simulate/renewable-drop` — updates signal, calls `reoptimize()`, persists changed sessions
- [ ] WebSocket `/ws/updates` — broadcast `PlanChangedEvent` and `session_update` to all connected clients
- [ ] CORS configured for local frontend dev origin
- [ ] Replace `scheduler_stub` import with real Scheduler module once available (single import line change)
- [ ] Replace `forecasting_stub` import with real Forecasting module once available (single import line change)
- [ ] Seed script: creates 2 ports + a few sample EV requests for demo bootstrapping
- [ ] `backend/README.md`: how to run, how to hit each endpoint (curl examples)

## 6. Files you own

```
backend/
├── app/
│   ├── main.py
│   ├── models.py
│   ├── db.py
│   ├── routes/
│   ├── ws.py
│   ├── scheduler_stub.py      # replaced by real module later
│   └── forecasting_stub.py    # replaced by real module later
├── requirements.txt
└── README.md
```

## 7. Definition of Done

- Every endpoint in the contract works against curl/Postman with stubs
- WebSocket clients receive a message within ~1s of `/api/simulate/renewable-drop` being called
- Swapping either stub for the real Scheduler/Forecasting module requires editing only the one import line, nothing else

## 8. Progress Log
_(AI agent: append entries here, most recent last)_

- `[timestamp]` — Track started.
