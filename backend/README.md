# VoltWise — FastAPI Backend Server

**Owner:** Rutvi Kariya & Team  
**Package:** `backend/`

FastAPI server providing REST endpoints, SQLite persistence, WebSocket realtime updates (`/ws/updates`), and integration with the Scheduling engine and Forecasting signals.

---

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Server
```bash
uvicorn app.main:app --reload --port 8000
```

---

## API Endpoints (`http://localhost:8000`)

- `POST /api/ev-requests` — Submit new EV request, returns scheduled Session.
- `GET /api/sessions/{id}` — Fetch session details by ID.
- `GET /api/schedule` — Returns full `StationState` snapshot for Operator Dashboard.
- `GET /api/renewable-signal` — Returns 24-hour renewable grid forecast.
- `POST /api/simulate/renewable-drop` — Triggers 1:30 PM renewable drop event and broadcasts `PlanChangedEvent` over WebSocket.
- `WS /ws/updates` — Realtime WebSocket connection for live UI toasts.

---

## Testing Endpoints with curl

### Create EV Request
```bash
curl -X POST "http://localhost:8000/api/ev-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_class": "normal",
    "current_soc": 20.0,
    "target_soc": 80.0,
    "deadline": "2026-09-12T18:00:00Z",
    "charging_rate_kw": 50.0,
    "preference": "greenest"
  }'
```

### Trigger Renewable Drop Simulation
```bash
curl -X POST "http://localhost:8000/api/simulate/renewable-drop" \
  -H "Content-Type: application/json" \
  -d '{ "new_score": 54.0 }'
```
