# VoltWise — Adaptive EV Charging for a Renewable-Powered Grid

[![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Tailwind-61DAFB?logo=react&logoColor=black)](frontend/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688?logo=fastapi&logoColor=white)](backend/)
[![Netlify](https://img.shields.io/badge/Frontend-Netlify%20Live-00C7B7?logo=netlify&logoColor=white)](#-production-deployments)
[![Render](https://img.shields.io/badge/Backend-Render%20Live-46E3B7?logo=render&logoColor=white)](#-production-deployments)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()

**HackOut'26 — Team ByteSized Brains**  
An enterprise-grade, AI-orchestrated EV charging platform that aligns electric vehicle charging demand with real-time solar & wind power availability to shave peak grid loads, cut carbon emissions, and reduce charging costs.

---

## 🌐 Production Deployments

| Component | Platform | Status | Live Link |
| :--- | :--- | :--- | :--- |
| **Frontend Application** | Netlify | ![Live](https://img.shields.io/badge/Status-Live-brightgreen) | Hosted on Netlify (React SPA + Tailwind CSS) |
| **Backend API & WebSockets** | Render | ![Live](https://img.shields.io/badge/Status-Live-brightgreen) | [`https://voltwise-backend-s9py.onrender.com`](https://voltwise-backend-s9py.onrender.com) |
| **Interactive API Documentation** | Render | ![Live](https://img.shields.io/badge/Status-Live-brightgreen) | [`https://voltwise-backend-s9py.onrender.com/docs`](https://voltwise-backend-s9py.onrender.com/docs) |

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
├── Dockerfile                  # Root Dockerfile for automated cloud container builds (Render)
├── netlify.toml                # Netlify build configuration & SPA rewrite rules
├── render.yaml                 # Render Blueprint deployment configuration
├── frontend/                   # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── api/client.ts       # Unified API client (FastAPI & WebSocket client)
│   │   ├── components/         # Header, Toasts, Tubelight Navbar, Background Snippets
│   │   ├── views/              # DriverView.tsx & OperatorView.tsx
│   │   ├── types/index.ts      # TypeScript interfaces matching API contract
│   │   └── App.tsx             # Root application container
│   ├── public/
│   │   ├── logo.png            # High-contrast transparent VoltWise logo
│   │   └── _redirects          # Netlify SPA routing fallback
│   ├── Dockerfile              # Multi-stage Dockerfile for React + Nginx
│   ├── nginx.conf              # Production Nginx reverse proxy configuration
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
│   ├── Dockerfile              # Container image build for FastAPI
│   └── requirements.txt
├── deploy/                     # Deployment Configurations & Scripts
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
- Docker & Docker Compose (Optional for containerized run)

---

### 2. Running the Backend Server (FastAPI)

```bash
# Run from repository root
python -m uvicorn backend.app.main:app --reload --port 8000
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

---

### 4. Running via Docker Compose

```bash
cd deploy
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

---

## 🚀 Cloud Deployment Setup

### Netlify (Frontend)
- **Base Directory**: `frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `frontend/dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL` = `https://voltwise-backend-s9py.onrender.com/api`
  - `VITE_WS_BASE_URL` = `wss://voltwise-backend-s9py.onrender.com/ws/updates`

### Render (Backend)
- Automated using [`render.yaml`](render.yaml) or root [`Dockerfile`](Dockerfile).
- **Environment Variables**:
  - `PYTHONPATH` = `.`
  - `DEMO_CITY` = `Ahmedabad`

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
