# VoltWise — Integration Guide (1-2 Day Build)

Read this after everyone has read `00-API-Contract.md` and their own PRD.

## Repo & branch setup

```bash
mkdir voltwise && cd voltwise
git init && git branch -M main
printf "node_modules/\n__pycache__/\n.env\n*.db\n.venv/\n" > .gitignore
git add . && git commit -m "Initial commit"

# create an EMPTY repo on github.com first (no README/license), then:
git remote add origin git@github.com:<org-or-user>/voltwise.git
git push -u origin main

for b in dhanya vanshi tanvi rutvi; do
  git checkout -b $b main && git push -u origin $b
done
git checkout main
```

Add all four PRDs and the API contract to the repo root immediately:

```bash
mkdir docs
mv 00-API-Contract.md PRD-01-Frontend.md PRD-02-Backend-API.md \
   PRD-03-Scheduler.md PRD-04-Forecasting-Simulation.md docs/
git add docs/ && git commit -m "Add PRDs and API contract" && git push
```

## Why this split works without blocking

- **Frontend** builds against mock JSON matching the contract — never blocked by Backend.
- **Backend** builds against stubbed Scheduler/Forecasting functions with the exact same signatures the real modules will have — never blocked by them.
- **Scheduler** and **Forecasting** are pure functions with no framework dependencies — testable standalone with fixture data, never blocked by anyone.

This means all four people can work the entire first day without touching each other's branches. Integration is a swap-in, not a rewrite.

## Suggested timeline (1-2 days)

**Hour 0-1 (everyone together):**
- Confirm the API contract, lock it, everyone commits their PRD
- Pick the demo city (Forecasting)
- Agree on the specific demo script moment (86%→54% drop, at what point in the walkthrough)

**Day 1 (parallel, independent):**
- Each person works their branch against mocks/stubs/fixtures per their PRD checklist
- Merge to `main` in small chunks every few hours (not one big merge) — even partial, mock-backed work should merge so `main` accumulates progress
- Check in at the halfway point: has anyone hit a contract mismatch? Fix immediately, don't let it fester

**Day 1 end / Day 2 morning — First integration pass:**
1. Backend owner replaces `scheduler_stub` import with the real Scheduler module (one-line swap per the contract)
2. Backend owner replaces `forecasting_stub` import with the real Forecasting module (one-line swap)
3. Frontend owner flips `USE_MOCK = false` and points at the running Backend
4. Run through Steps A-H from the pitch deck's walkthrough end-to-end
5. Fix integration bugs together — this is expected to take longer than anyone thinks, budget real time for it

**Day 2 — Polish & demo prep:**
- Deployment/runbook finalized (Forecasting/Sim owner)
- Full dry run of the demo script, twice, on the actual presenting machine
- Fallback plan: if live weather API or live deploy fails during judging, fall back to local + canned data (this is why the fallback task in PRD-04 isn't optional)

## Integration checklist (run this together, not solo)

- [ ] Real Scheduler swapped into Backend, fixture scenarios still pass through the API
- [ ] Real Forecasting swapped into Backend, `/api/renewable-signal` returns live data
- [ ] Frontend pointed at real Backend, mock mode off
- [ ] WebSocket plan-change notification visibly fires in the UI when `/api/simulate/renewable-drop` is called
- [ ] Priority EV visibly protected during the demo's re-optimization moment
- [ ] Before/after impact chart shows a real, non-trivial difference
- [ ] Full runbook dry-run #1 — note failures
- [ ] Full runbook dry-run #2 — confirm fixes held
- [ ] Fallback (offline/canned data) path also dry-run once

## When a PRD's Status field matters

Each PRD has a `Status` field (`⬜ Not Started` / `🟡 In Progress` / `🟢 Done`)
and a Progress Log. If you're using an AI coding agent per track, have it
keep that file updated as it works — at a glance during check-ins, everyone
can see `docs/PRD-*.md` and know exactly where the other three tracks stand
without a status meeting.
