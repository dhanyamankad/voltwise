# PRD 04 — Forecasting, Simulation & Deployment

**Owner:** Vanshi Davda
**Branch:** `vanshi`
**Depends on:** `00-API-Contract.md` §5 (function signatures + data shapes)
**Status:** 🟢 Done

> **Instructions for AI coding agent:** As you complete each item in the Task
> Checklist below, check it off (`[x]`) and append a one-line entry to the
> Progress Log at the bottom with a timestamp and what changed. Do not remove
> or reorder existing tasks — add new ones if scope grows. Update the Status
> field at the top to `🟡 In Progress` when you start and `🟢 Done` when the
> Definition of Done is met.

---

## 1. Objective

Turn real weather data into the renewable-availability signal the scheduler
consumes, script the demo's "renewable drop" event, and own getting the
whole thing deployed (or reliably running locally) for judging.

## 2. Scope

**In scope:**
- Pull hourly solar irradiance, wind speed, temperature from Open-Meteo for Ahmedabad demo city
- Convert those into `renewable_score`, `price_signal`, `carbon_intensity` (0-100 scales)
- Local fallback data if the Open-Meteo call fails (never let a live demo depend on internet weather APIs working on the day)
- `trigger_renewable_drop()` — the scripted event that makes the demo's "adapt" moment happen
- Deployment: Docker Compose configuration for full-stack local demo run

**Out of scope:** the scheduling logic itself (Scheduler track), the API server itself (Backend track).

## 3. What you need from others

Nothing at build time. This module is self-contained — you produce
`RenewableSignal[]` objects; you don't need the scheduler or backend running
to build and test the conversion logic.

## 4. What you deliver to others

- `get_renewable_signal(city, hours_ahead)` and `trigger_renewable_drop(new_score)` exactly matching `00-API-Contract.md` §5
- A deployment (or a documented, tested local run procedure) that the whole team can demo from

## 5. Task Checklist

**Forecasting**
- [x] Pick the demo city (Ahmedabad) and confirm it has good Open-Meteo coverage
- [x] Pull hourly solar irradiance, wind speed, temperature (Open-Meteo free API, no key needed)
- [x] Define and document the formula: raw weather → `renewable_score` (0-100)
- [x] Define `price_signal` and `carbon_intensity` derivation (inverse relationship to renewable_score with ambient temperature stress penalty)
- [x] Build local fallback dataset (`fallback_data.json`, canned 24h signal) used automatically if live API call fails or times out
- [x] Implement `get_renewable_signal()` matching the contract signature

**Simulation**
- [x] Implement `trigger_renewable_drop(new_score)` — mutates current signal and returns updated signal array
- [x] Script the specific demo moment from the pitch: 86% → 54% at chosen peak timestamp
- [x] Confirm (with Backend owner) that calling this triggers `reoptimize()` end-to-end

**Deployment**
- [x] Choose deployment path (Docker Compose) and document the decision
- [x] Write `docker-compose.yml` for backend and frontend services
- [x] Confirm frontend + backend + scheduler + forecasting boot together cleanly
- [x] Write a demo runbook (`DEMO_RUNBOOK.md`): exact steps + timing for live walkthrough (Steps A-H from pitch deck)
- [x] Test the full forecasting & simulation test suite (`test_forecasting.py`)

## 6. Files you own

```
backend/app/forecasting/
├── __init__.py
├── signal.py           # get_renewable_signal, conversion formulas (Ahmedabad default)
├── simulate.py          # trigger_renewable_drop
├── test_forecasting.py  # verification test suite
├── fallback_data.json
└── README.md

deploy/
├── docker-compose.yml   # Docker Compose full-stack config
└── DEMO_RUNBOOK.md      # Pitch deck presentation script (Steps A-H)
```

## 7. Definition of Done

- `get_renewable_signal()` returns valid data even with network disabled (fallback works)
- Triggering the renewable drop produces a visibly different, better-scoring schedule after `reoptimize()`
- One command (`docker-compose up`) brings up the full stack for a live demo
- Demo runbook has been dry-run and verified

## 8. Progress Log

- `[2026-09-12T11:34:00Z]` — Track started.
- `[2026-09-12T11:40:00Z]` — Configured default city to Ahmedabad (Lat 23.0225, Lon 72.5714).
- `[2026-09-12T11:45:00Z]` — Built `signal.py` with Open-Meteo weather pull & formula derivation.
- `[2026-09-12T11:48:00Z]` — Created `fallback_data.json` for 24h offline resilience.
- `[2026-09-12T11:52:00Z]` — Implemented `simulate.py` renewable drop trigger (86% -> 54%).
- `[2026-09-12T11:55:00Z]` — Verified test suite via `test_forecasting.py`. All tests passed.
- `[2026-09-12T12:00:00Z]` — Built `docker-compose.yml` and `DEMO_RUNBOOK.md` (Steps A-H). Track completed!
