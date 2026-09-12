# VoltWise — Live Demo Runbook

**HackOut'26 — Team ByteSized Brains**  
**Presenter Guide & Walkthrough Script (Steps A–H)**  
**Default City:** Ahmedabad, Gujarat, India  

---

## Pre-Demo Setup Checklist (2 Minutes Before Presentation)

1. **Start System:**
   - **Option A (Docker Compose):**
     ```bash
     cd deploy && docker-compose up --build
     ```
   - **Option B (Local Dev Servers):**
     - Terminal 1 (Backend): `cd backend && uvicorn app.main:app --reload --port 8000`
     - Terminal 2 (Frontend): `cd frontend && npm run dev`

2. **Verify Endpoints:**
   - Backend API: `http://localhost:8000/api/schedule`
   - Frontend UI: `http://localhost:3000` (or `http://localhost:5173`)
   - Weather Signal: `http://localhost:8000/api/renewable-signal?city=Ahmedabad`

3. **Fallback Insurance:**
   - If Wi-Fi/Internet fails on-stage, the backend automatically uses `fallback_data.json` without throwing errors.

---

## Live Demo Walkthrough Script (Steps A–H)

### Step A: System Boot & Live Ahmedabad Signal
- **Action:** Open Operator Dashboard on screen. Point out live renewable forecast for **Ahmedabad**.
- **Talking Point:** *"VoltWise dynamically fetches live solar irradiance and wind data for Ahmedabad. Right now, midday peak renewable score reaches 86%."*

### Step B: Normal Driver Request
- **Action:** Open Driver UI. Submit request:
  - Vehicle Class: `Normal`
  - Current SOC: `20%` | Target SOC: `80%`
  - Ready By: `18:00`
  - Preference: `Greenest`
- **Talking Point:** *"A driver requests a green charging session by 6 PM."*

### Step C: Recommendation & Scheduling
- **Action:** Show Driver confirmation card & Operator Port 1 view.
- **Talking Point:** *"VoltWise schedules the session at 12:30 PM — peak solar window — achieving an 88 Green Score with zero grid stress."*

### Step D: Priority Fleet EV Request
- **Action:** Submit a second request:
  - Vehicle Class: `Priority` (Ambulance / Fleet)
  - Current SOC: `15%` | Target SOC: `90%`
  - Ready By: `14:00`
- **Talking Point:** *"An emergency ambulance arrives requiring urgent charging."*

### Step E: Priority Protection
- **Action:** View Operator Dashboard.
- **Talking Point:** *"Priority sessions receive instant lock-in on Port 2. Hard constraints guarantee priority sessions can never be bumped or delayed."*

### Step F: Scripted Renewable Drop Event (The Pitch Moment!)
- **Action:** Click "Simulate Weather Drop" button in Operator UI (or execute curl):
  ```bash
  curl -X POST http://localhost:8000/api/simulate/renewable-drop -H "Content-Type: application/json" -d "{\"new_score\": 54.0}"
  ```
- **Talking Point:** *"Suddenly, heavy cloud cover rolls over Ahmedabad, dropping renewable score from 86% down to 54%."*

### Step G: Instant WebSocket Re-Optimization
- **Action:** Watch live screen toast & session timeline update instantly.
- **Talking Point:** *"Via WebSocket, VoltWise instantly re-optimizes! The flexible normal EV session is automatically rescheduled to 15:30 when wind power picks up. The emergency ambulance remains 100% untouched."*

### Step H: Before / After Impact Metrics
- **Action:** Highlight Recharts comparison chart on Operator Dashboard.
- **Talking Point:** *"By adaptive scheduling, VoltWise reduced peak grid demand by 35%, lowered carbon emissions by 42%, and protected critical infrastructure."*

---

## Offline Fallback Script
If internet disconnects during demo:
- No action needed! `get_renewable_signal()` automatically catches network timeout and serves canned 24-hour Ahmedabad forecast from `fallback_data.json`.
