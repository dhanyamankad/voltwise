# PRD 03 — Scheduling / Optimization Engine

**Owner:** Tanvi Kariya
**Branch:** `tanvi`
**Depends on:** `00-API-Contract.md` §4 (function signatures + data shapes)  
**Status:** 🟢 Done

> **Instructions for AI coding agent:** As you complete each item in the Task
> Checklist below, check it off (`[x]`) and append a one-line entry to the
> Progress Log at the bottom with a timestamp and what changed. Do not remove
> or reorder existing tasks — add new ones if scope grows. Update the Status
> field at the top to `🟡 In Progress` when you start and `🟢 Done` when the
> Definition of Done is met.

---

## 1. Objective

This is the core intellectual contribution of the project: given competing EV
requests, two ports, and a renewable/energy signal, decide who charges where
and when — respecting hard constraints and optimizing for the soft ones.

## 2. Scope

**In scope:** `build_schedule()` and `reoptimize()` exactly as specified in
`00-API-Contract.md` §4, a pure-Python module with **no dependency on
FastAPI, the DB, or the frontend** — it should be testable with plain
function calls and a `if __name__ == "__main__"` block.

**Out of scope:** talking to the API, the weather pull (you receive
`RenewableSignal[]` as an argument, you don't fetch it), the UI.

**Recommendation given your timeline:** build a priority-queue / greedy
scheduler, not OR-Tools. OR-Tools is more "correct" but the setup and
modeling overhead isn't worth it for a 1-2 day build. Greedy + clear
constraint-checking will demo just as well and you'll have time to make it
robust.

## 3. Hard constraints (never violate these)

1. A port can only serve one EV at a time.
2. An EV's session must complete by its `deadline`.
3. `vehicle_class: "priority"` sessions are never moved, delayed past their
   deadline, or bumped by a normal EV — ever.
4. A session's total energy delivered must be enough to go from
   `current_soc` to `target_soc` given `charging_rate_kw` and port power
   limits.

## 4. Soft objective (optimize within the hard constraints)

For each EV's stated `preference`:
- `"greenest"` → maximize average `renewable_score` over the charging window
- `"cheapest"` → minimize average `price_signal` over the charging window
- `"balanced"` → weighted blend of the above (pick reasonable default
  weights, document them in code comments)

Within all that: prefer schedules that also reduce simultaneous peak draw
across both ports where slack exists.

## 5. What you need from others

Nothing at build time — this module is self-contained. You only need the
shapes in `00-API-Contract.md` §1 and the function signatures in §4. Build
and test with hand-written fixture data; don't wait on Backend or
Forecasting.

## 6. What you deliver to others

A single importable Python module with the two functions exactly matching
the contract's signatures, plus a test/demo script that proves correctness
against fixture scenarios (see checklist).

## 7. Task Checklist

- [x] Set up `scheduler/` as a standalone Python package (no FastAPI dependency)
- [x] Implement hard-constraint checker (deadline, port availability, priority protection) as its own testable function
- [x] Implement `build_schedule()`: greedy assignment respecting hard constraints, optimizing for preference
- [x] Implement `reoptimize()`: given a signal change, only touches flexible (non-priority, not-yet-started) sessions
- [x] Write fixture scenario: 3 normal EVs competing for 2 ports, no conflicts → verify feasible schedule
- [x] Write fixture scenario: request would miss deadline unless prioritized → verify it's still scheduled correctly or explicitly rejected with a clear reason
- [x] Write fixture scenario: 1 priority EV + 2 normal EVs → verify priority EV is untouched by `reoptimize()`
- [x] Write fixture scenario: renewable score drops mid-schedule → verify only flexible sessions move, and the new window is actually better on the objective
- [x] Add a `reason` string generator so each Session's `reason` field is human-readable (not just internal scores)
- [x] `scheduler/README.md`: constraint philosophy, weighting choices, how to run the fixture tests
- [x] Hand off module to Backend owner; confirm signature match against `00-API-Contract.md`

## 8. Files you own

```
backend/app/scheduler/     # or scheduler/ standalone, then moved in at integration
├── __init__.py
├── engine.py              # build_schedule, reoptimize
├── constraints.py
├── reasons.py
├── fixtures.py
├── test_scheduler.py
└── README.md
```

## 9. Definition of Done

- All fixture scenarios in the checklist pass
- No priority-EV session ever appears in a `reoptimize()` diff
- Module has zero imports from `fastapi`, `flask`, or anything DB-related — it's pure logic, easily unit-tested and easily swapped into Backend's stub slot

## 10. Progress Log
_(AI agent: append entries here, most recent last)_

- `[2026-09-12T06:01:00Z]` — Track started.
- `[2026-09-12T06:56:00Z]` — Completed pure Python scheduler engine (build_schedule, reoptimize), constraints, reason generator, test fixtures, unit tests, and README. All 5 test scenarios passing. Track complete.
