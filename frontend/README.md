# VoltWise Frontend — Enterprise Driver View & Operator Console

**Track 01 (Dhanya Mankad)** — Standalone React + Vite + Tailwind CSS application for the **VoltWise AI EV Charging Orchestrator**. Inspired by modern enterprise energy dashboards and built to strict API contract specifications (`docs/00-API-Contract.md`).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Verify Production Build
```bash
npm run build
```

---

## ⚡ Mock Mode vs. Live FastAPI Backend

All API requests and WebSocket subscriptions flow through a single unified client interface: [`src/api/client.ts`](file:///d:/VoltWise/frontend/src/api/client.ts).

To switch between offline mock mode and the live FastAPI backend:

1. Open `src/api/client.ts`
2. Toggle the single boolean constant:
   ```typescript
   export const USE_MOCK = false; // Set to 'false' for live FastAPI backend (http://localhost:8000)
   ```
3. Save the file. The frontend automatically routes API calls to `http://localhost:8000/api` and connects WebSockets to `ws://localhost:8000/ws/updates`.

---

## ✨ Design System & App Standards

- **Brand Identity**: Custom transparent high-contrast VoltWise logo (`/logo.png?v=6`) with electric cyan lightning bolt.
- **Typography**: Inter font (`font-sans`, `font-display`, `font-body`) enforced globally.
- **Currency**: Standardized to **INR (`₹`)** across all components, estimates, and schedules.
- **Time Format**: Standardized to **12-Hour AM/PM** (`2:15 PM`, `4:30 PM`, `5:30 PM`, `12:00 AM`, `12:00 PM`) for all timestamps and windows.
- **Background Aesthetics**: Integrated `ibelick` animated dot matrix + radial grid background snippet (`background-snippets.tsx`).

---

## 🌟 Key Features

### 1. Driver View (`DriverView.tsx`)
- **Interactive EV Request Form**:
  - Vehicle Class selection (`Normal EV` vs `Priority Ambulance / Fleet`).
  - Dual Battery SOC sliders (`Current SOC` vs `Target SOC`).
  - Strict Form Validation: Prevents submission when `Current SOC > Target SOC` (displays amber warning banner, turns target gauge red, and disables the submit button).
  - Target Deadline picker & Preference choice (`Greenest`, `Cheapest`, `Balanced`).
- **AI Recommendation Card**:
  - Assigned charging window (`2:15 PM – 4:30 PM`) and allocated Port.
  - Interactive Radial Green Energy Score gauge (`88%`).
  - Forecasted solar & wind irradiance curve visualization.
  - Energy Cost & CO2 abatement metrics in INR (`₹`).
  - Human-readable AI optimization rationale.

### 2. Operator Console (`OperatorView.tsx`)
- **Real-Time 2-Port Station Monitor**:
  - `Port 1`: 50 kW Clean Sync (EV-104 @ 88% solar availability).
  - `Port 2`: 100 kW Critical Override (AMB-911 Priority Ambulance locked session).
- **Pending Dispatch Queue**: Priority-sorted vehicle queue with real-time status badges.
- **24-Hour Grid Signal Graph**: SVG visualization comparing renewable availability against dynamic price index.
- **Station Impact Metrics**:
  - **58%** Peak Demand Shaving.
  - **100%** Green Energy Boost.
  - **43%** Cost Cut in INR.
  - **66%** CO2 Abated.
- **Grid Event Simulation Trigger**: Interactive button to fire a 30% solar drop simulation (`POST /api/simulate/renewable-drop`).

### 3. Real-Time WebSocket Alerts (`useLiveUpdates.ts` & `PlanChangedToast.tsx`)
- Automatic WebSocket connection to `/ws/updates`.
- Animated toast notification alerts operators when grid conditions drop and AI re-optimizes charging schedules.

---

## 📁 Directory Structure

```
frontend/
├── public/
│   └── logo.png                # Transparent high-contrast VoltWise logo
├── src/
│   ├── api/
│   │   └── client.ts           # Unified API client (Mock & Live FastAPI switcher)
│   ├── components/
│   │   ├── Header.tsx          # Main navigation & live energy mix pill
│   │   ├── PlanChangedToast.tsx# WebSocket re-optimization toast
│   │   └── ui/
│   │       ├── background-snippets.tsx                   # ibelick radial dot-grid background
│   │       ├── digital-serenity-animated-landing-page.tsx# Animated landing page hero
│   │       └── tubelight-navbar.tsx                      # Floating tubelight tab navigation
│   ├── hooks/
│   │   └── useLiveUpdates.ts   # WebSocket real-time updates hook
│   ├── mock/
│   │   └── schedule.json       # Contract-compliant mock schedule data
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces matching API contract
│   ├── views/
│   │   ├── DriverView.tsx      # EV Charging Request & AI Recommendation View
│   │   └── OperatorView.tsx    # 2-Port Station Dispatch & Analytics Console
│   ├── App.tsx                 # Root application container & view router
│   ├── index.css               # Global CSS & Inter font import
│   └── main.tsx                # Application entry point
├── package.json
├── tailwind.config.js
└── vite.config.ts
```
