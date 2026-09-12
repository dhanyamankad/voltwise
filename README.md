# VoltWise — Adaptive EV Charging for a Renewable-Powered Grid

[![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Tailwind-61DAFB?logo=react&logoColor=black)](frontend/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688?logo=fastapi&logoColor=white)](backend/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()

**HackOut'26 — Team ByteSized Brains**  
An enterprise-grade, AI-orchestrated EV charging platform that aligns electric vehicle charging demand with real-time solar & wind power availability to shave peak grid loads, cut carbon emissions, and reduce charging costs.

---

## ⚡ Key Highlights & Features

- **Driver Experience**:
  - Interactive EV Charging Request Portal with custom SOC sliders and SOC validation (`current_soc <= target_soc`).
  - AI Recommendation Engine displaying allocated charging window, radial green energy score, forecasted solar curve, INR (`₹`) cost estimates, and human-readable optimization rationale.
  - Flexible driver preferences: **Greenest**, **Cheapest**, or **Balanced**.

- **Operator Dispatch Console**:
  - Real-time **2-Port Station Monitor**:
    - `Port 1` (50 kW Clean Sync for standard EVs).
    - `Port 2` (100 kW Critical Override for emergency response vehicles & ambulances).
  - Priority Dispatch Queue with real-time status tracking.
  - 24-Hour Grid Signal Graph comparing renewable score against dynamic pricing.
  - Station Impact Analytics: **58%** Peak Demand Shaving, **100%** Green Boost, **43%** Cost Savings (INR), **66%** CO2 Abatement.

- **Intelligent 2-Port Scheduler**:
  - **Hard Constraints**: Port capacity capping ($\le 1$ EV/port), deadline guarantee, and non-displaceable priority vehicle locking.
  - **Re-optimization Engine**: Automatic schedule adjustments when grid conditions fluctuate.

- **Forecasting & Grid Simulation**:
  - Live weather integration via Open-Meteo API (Solar irradiance, wind speed, temperature) for Ahmedabad.
  - Resilient offline fallback dataset (`fallback_data.json`).
  - Interactive **30% Solar Drop Simulation Trigger** for live pitch demos with WebSocket push alerts (`PlanChangedToast`).

---

## 👥 Track Ownership & Architecture

| Track | Owner | Scope | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Track 01 — Frontend** | **Dhanya Mankad** (`dhanya`) | React + Vite + Tailwind UI | Driver View, Operator Console, Header Navbar, ibelick Background Snippets, Landing Page |
| **Track 02 — Backend API** | **Rutvi Kariya** (`rutvi`) | FastAPI Gateway & DB | REST Endpoints, SQLite Persistence, WebSocket `/ws/updates` Broadcaster |
| **Track 03 — Scheduler** | **Tanvi Kariya** (`tanvi`) | Optimization Engine | 2-Port Allocation, Hard Constraints, Soft Preference Weighting, Schedule Re-optimizer |
| **Track 04 — Forecasting** | **Vanshi Davda** (`vanshi`) | Signal & Simulation | Open-Meteo API Fetcher, Renewable Score Generator, Demo Solar Drop Simulator, Docker |

---

## 📁 Repository Structure

```
VoltWise/
├── frontend/                   # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── api/client.ts       # Unified API client (Mock mode & FastAPI switcher)
│   │   ├── components/         # Header, Toasts, Tubelight Navbar, Background Snippets
│   │   ├── views/              # DriverView.tsx & OperatorView.tsx
│   │   ├── types/index.ts      # TypeScript interfaces matching API contract
│   │   └── App.tsx             # Root application container
│   ├── public/logo.png         # High-contrast transparent VoltWise logo
│   ├── package.json
│   └── vite.config.ts
├── backend/                    # FastAPI Backend Application
│   ├── app/
│   │   ├── scheduler/          # Track 03: 2-Port Optimization & Constraint Engine
│   │   ├── forecasting/        # Track 04: Weather fetch, signal generation & simulation
│   │   ├── routes/api.py       # REST API endpoints
│   │   ├── ws.py               # WebSocket broadcaster
│   │   ├── db.py               # SQLite database client
│   │   └── main.py             # FastAPI entry point
│   └── requirements.txt
├── deploy/                     # Deployment Configuration
│   ├── docker-compose.yml      # Containerized deployment spec
│   └── DEMO_RUNBOOK.md         # Live demo step-by-step instructions
└── docs/                       # Project Documentation & Specifications
    ├── 00-API-Contract.md      # Master API Contract & Schema Definition
    ├── PRD-01-Frontend.md      # Frontend PRD
    ├── PRD-02-Backend-API.md   # Backend API PRD
    ├── PRD-03-Scheduler.md     # Scheduler Engine PRD
    ├── PRD-04-Forecasting.md   # Forecasting & Simulation PRD
    └── DESIGN_BRIEF.md         # UI/UX & Brand Aesthetics Guide
```

---

## 🚦 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- Python (3.11+)

---

### 2. Running the Backend Server (FastAPI)

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend server will run at `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs`.

---

### 3. Running the Frontend Application (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
Frontend will run at `http://localhost:3000`.

> **Note**: To connect the frontend directly to the live FastAPI backend server, open [`frontend/src/api/client.ts`](file:///d:/VoltWise/frontend/src/api/client.ts) and set `export const USE_MOCK = false;`.

---

### 4. Running via Docker Compose

```bash
cd deploy
docker-compose up --build
```

---

## 🧪 Testing

### Frontend Build Test
```bash
cd frontend
npm run build
```

### Backend Scheduler & Forecasting Unit Tests
```bash
# Run Scheduler Unit Tests
python -m unittest backend/app/scheduler/test_scheduler.py

# Run Forecasting Unit Tests
python -m unittest backend/app/forecasting/test_forecasting.py
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
