# VoltWise Frontend — Driver & Operator UI

Track 01 (Dhanya Mankad) — Standalone React + Vite + Tailwind CSS application for VoltWise AI EV Charging Orchestrator.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

The app will start at `http://localhost:3000`.

## How to Switch Between Mock Mode and Live Backend

All API and WebSocket calls pass through `src/api/client.ts`.

To switch from Mock Mode to the Live Backend:

1. Open `src/api/client.ts`
2. Change the single toggle constant:
   ```typescript
   export const USE_MOCK = false; // set to false for Live FastAPI Backend
   ```
3. Save the file. The app will automatically connect to `http://localhost:8000/api` and `ws://localhost:8000/ws/updates`.

## Features Included

- **Driver View**:
  - Interactive EV Charging Request Form (Vehicle class, SOC sliders, Deadline, Preference radio choices).
  - AI Recommendation Result Card (Assigned window, Port allocation, Radial Green Energy Score gauge, Forecasted solar curve, Cost/CO2 metrics, AI rationale).
- **Operator Console**:
  - Real-time 2-Port Station Monitor (`Port 1` clean sync vs `Port 2` critical ambulance priority).
  - Pending Dispatch Queue with priority badges.
  - 24-Hour Grid Signal & Renewable Forecast SVG graph.
  - VoltWise Station Impact Analytics (58% peak demand shaving, 100% green boost, 43% cost cut, 66% CO2 abated).
  - Interactive **Grid Event Simulation Trigger** (`⚡ Trigger 30% Solar Drop Simulation`).
- **Live Notifications**:
  - WebSocket client hook (`useLiveUpdates`) with animated `PlanChangedToast` alerts on schedule updates.
