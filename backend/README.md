# VoltWise Backend — FastAPI Server & REST/WS Gateway

**Track 02 (Rutvi Kariya)** — FastAPI backend server providing REST API endpoints, SQLite persistence, WebSocket real-time updates (`/ws/updates`), and seamless integration with the Scheduling Engine and Forecasting Module.

---

## 🚀 Quick Start

### 1. Set Up Virtual Environment & Dependencies
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Start FastAPI Server
```bash
uvicorn app.main:app --reload --port 8000
```

The server will start at `http://localhost:8000`. Interactive OpenAPI documentation will be available at `http://localhost:8000/docs`.

---

## 📡 API Endpoints (`http://localhost:8000`)

Matching `docs/00-API-Contract.md`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ev-requests` | Submit new EV charging request; returns scheduled `Session`. |
| `GET` | `/api/sessions/{id}` | Retrieve specific session details by ID. |
| `GET` | `/api/schedule` | Returns full `StationState` snapshot (Ports, Queue, Metrics) for Operator Dashboard. |
| `GET` | `/api/renewable-signal` | Returns 24-hour renewable grid forecast (solar irradiance, wind speed, price signal). |
| `POST` | `/api/simulate/renewable-drop` | Triggers a simulated renewable drop event and broadcasts `PlanChangedEvent` over WebSockets. |
| `WS` | `/ws/updates` | Real-time WebSocket endpoint for broadcasting live schedule re-optimizations. |

---

## 🧪 Testing Endpoints with `curl`

### 1. Submit EV Charging Request
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

### 2. Fetch Station Schedule
```bash
curl -X GET "http://localhost:8000/api/schedule"
```

### 3. Trigger Renewable Drop Simulation
```bash
curl -X POST "http://localhost:8000/api/simulate/renewable-drop" \
  -H "Content-Type: application/json" \
  -d '{ "new_score": 54.0 }'
```

---

## 📁 Package Architecture

```
backend/
├── app/
│   ├── forecasting/            # Track 04: Open-Meteo weather & renewable signal generation
│   │   ├── fallback_data.json  # Offline fallback signal dataset
│   │   ├── signal.py           # Live weather fetch & renewable score derivation
│   │   ├── simulate.py         # Renewable drop simulation handler
│   │   └── test_forecasting.py # Forecasting test suite
│   ├── scheduler/              # Track 03: 2-Port Optimization Engine
│   │   ├── constraints.py      # Hard constraint checkers (port capacity, deadlines, priority lock)
│   │   ├── engine.py           # Core build_schedule & reoptimize algorithms
│   │   ├── fixtures.py         # Test fixtures & initial station state
│   │   ├── models.py           # Scheduler data models
│   │   ├── reasons.py          # AI rationale generators
│   │   └── test_scheduler.py   # Scheduler unit test suite
│   ├── db.py                   # SQLite database initialization & CRUD sessions
│   ├── main.py                 # FastAPI application factory & router registration
│   ├── models.py               # Pydantic & SQLAlchemy schemas
│   ├── routes/
│   │   └── api.py              # REST API route handlers
│   └── ws.py                   # WebSocket connection manager & broadcaster
├── requirements.txt
└── README.md
```
