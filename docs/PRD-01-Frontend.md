# PRD 01 — Frontend (Driver & Operator UI)

**Owner:** Dhanya Mankad
**Branch:** `dhanya`
**Depends on:** `00-API-Contract.md` (build against mock data until Backend is live)
**Status:** ⬜ Not Started

> **Instructions for AI coding agent:** As you complete each item in the Task
> Checklist below, check it off (`[x]`) and append a one-line entry to the
> Progress Log at the bottom with a timestamp and what changed. Do not remove
> or reorder existing tasks — add new ones if scope grows. Update the Status
> field at the top to `🟡 In Progress` when you start and `🟢 Done` when the
> Definition of Done is met.

---

## 1. Objective

Build the two user-facing views described in the pitch deck: the **Driver
view** (request charging, see recommendation) and the **Operator view**
(monitor both ports, priority sessions, before/after impact).

## 2. Scope

**In scope:**
- Driver form: current SOC, target SOC, ready-by time, preference (balanced/cheapest/greenest)
- Recommendation screen: assigned window, price, Green Score, plain-English reason
- Live "your plan has changed" toast/banner (WebSocket-driven)
- Operator dashboard: 2-port occupancy view, pending queue, priority flags
- Before/after impact chart (peak load, renewable %, cost, CO2) using Recharts
- Mock-data mode so this track never blocks on Backend being ready

**Out of scope:** auth/login, payments, route planning, mobile-native app.

## 3. What you need from others

- **Backend:** the endpoints in `00-API-Contract.md` §2, and the WebSocket at `/ws/updates`
- Until those are live, build against a local mock (`mock/schedule.json`, `mock/signal.json`) matching the contract's TypeScript shapes exactly, so swapping in the real API later is a one-line change (just point `fetch`/`axios` base URL at the real host).

## 4. What you deliver to others

- A `frontend/` app that runs standalone (`npm run dev`) against mock data
- Clearly marked `src/api/client.ts` with a single toggle (`USE_MOCK = true/false`) so integration is trivial

## 5. Task Checklist

- [ ] Scaffold Vite + React + Tailwind project in `frontend/`
- [ ] Build mock data files matching `EVRequest`, `Session`, `Port`, `RenewableSignal` shapes exactly
- [ ] Driver request form (SOC/target/deadline/preference) with validation
- [ ] Recommendation card: window, price, Green Score badge, reason text
- [ ] WebSocket client hook (`useLiveUpdates`) that listens for `plan_changed` and `session_update`
- [ ] "Plan changed" toast component, wired to the hook
- [ ] Operator dashboard: 2-port status cards (idle/occupied, current session)
- [ ] Operator pending-queue list with priority badge for `vehicle_class: "priority"`
- [ ] Before/after impact chart (Recharts bar or line: peak load, renewable %, cost, CO2 — mock vs optimized)
- [ ] Loading/error states for all API calls
- [ ] `src/api/client.ts` mock/real toggle implemented and documented
- [ ] Basic responsive layout check (demo will likely run on a laptop projector — no need for mobile polish)
- [ ] README section in `frontend/README.md`: how to run, how to flip mock→real

## 6. Files you own

```
frontend/
├── src/
│   ├── api/client.ts
│   ├── components/
│   ├── views/DriverView.tsx
│   ├── views/OperatorView.tsx
│   └── hooks/useLiveUpdates.ts
├── mock/schedule.json
├── mock/signal.json
└── README.md
```
Do not edit files outside `frontend/` without flagging it in team chat.

## 7. Definition of Done

- Driver can submit a request and see a recommendation, using mock data, with zero backend running
- Operator dashboard renders both ports and updates live when a mock `plan_changed` event fires (simulate this with a `setTimeout` mock for local dev)
- Flipping `USE_MOCK` to `false` and pointing at a running backend requires no other code changes

## 8. Progress Log
_(AI agent: append entries here, most recent last)_

- `[timestamp]` — Track started.
