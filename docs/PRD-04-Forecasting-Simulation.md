# PRD 04 — Forecasting, Simulation & Deployment

**Owner:** Vanshi Davda
**Branch:** `vanshi`
**Depends on:** `00-API-Contract.md` §5 (function signatures + data shapes)
**Status:** ⬜ Not Started

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
- Pull hourly solar irradiance, wind speed, temperature from Open-Meteo for one demo city
- Convert those into `renewable_score`, `price_signal`, `carbon_intensity` (0-100 scales)
- Local fallback data if the Open-Meteo call fails (never let a live demo depend on internet weather APIs working on the day)
- `trigger_renewable_drop()` — the scripted event that makes the demo's "adapt" moment happen
- Deployment: pick ONE of (a) Vercel + Render, or (b) Docker Compose for local demo — don't do both, pick based on whichever is less new to you

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
- [ ] Pick the demo city and confirm it has good Open-Meteo coverage
- [ ] Pull hourly solar irradiance, wind speed, temperature (Open-Meteo free API, no key needed)
- [ ] Define and document the formula: raw weather → `renewable_score` (0-100)
- [ ] Define `price_signal` and `carbon_intensity` derivation (can be a simple inverse relationship to renewable_score for the prototype — document the assumption)
- [ ] Build local fallback dataset (canned 24h signal) used automatically if the live API call fails or times out
- [ ] Implement `get_renewable_signal()` matching the contract signature

**Simulation**
- [ ] Implement `trigger_renewable_drop(new_score)` — mutates the current signal and returns/signals the change
- [ ] Script the specific demo moment from the pitch: 86% → 54% at a chosen timestamp
- [ ] Confirm (with Backend owner) that calling this triggers `reoptimize()` end-to-end

**Deployment**
- [ ] Choose deployment path (cloud vs Docker Compose) and document the decision
- [ ] Write `docker-compose.yml` OR deployment configs for chosen platforms
- [ ] Confirm frontend + backend + scheduler + forecasting all boot together via one command
- [ ] Write a demo runbook: exact steps + timing for the live walkthrough (Steps A-H from the pitch deck), including when to trigger the renewable drop
- [ ] Test the full runbook at least twice before judging, ideally on the actual demo machine/network

## 6. Files you own

```
backend/app/forecasting/
├── __init__.py
├── signal.py           # get_renewable_signal, conversion formulas
├── simulate.py          # trigger_renewable_drop
├── fallback_data.json
└── README.md

deploy/
├── docker-compose.yml   # or vercel.json / render.yaml
└── DEMO_RUNBOOK.md
```

## 7. Definition of Done

- `get_renewable_signal()` returns valid data even with network disabled (fallback works)
- Triggering the renewable drop produces a visibly different, better-scoring schedule after `reoptimize()`
- One command (or one documented sequence) brings up the full stack for a live demo
- Demo runbook has been dry-run at least twice successfully

## 8. Progress Log
_(AI agent: append entries here, most recent last)_

- `[timestamp]` — Track started.
