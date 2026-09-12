# VoltWise Backend (API + Realtime + Persistence)

**Owner:** Rutvi Kariya (`rutvi` branch)  
FastAPI REST server, SQLite persistence, and WebSocket push engine coordinating EV charging schedules with renewable energy signals.

---

## 1. Quick Start

### Setup & Run locally
```powershell
# 1. Activate virtual environment
.\backend\.venv\Scripts\activate

# 2. Run database seed (creates 2 ports + demo EV requests)
python -m backend.seed

# 3. Start the FastAPI server on :8000
uvicorn backend.app.main:app --reload --port 8000
```

- **Interactive API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **WebSocket Endpoint:** `ws://localhost:8000/ws/updates`

---

## 2. API Endpoints

### `POST /api/ev-requests`
Submit a new charging request. Calls the scheduler engine, persists session, and broadcasts `session_update` to connected WebSocket clients.
```bash
curl -X POST http://localhost:8000/api/ev-requests \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_class": "normal",
    "current_soc": 35.0,
    "target_soc": 80.0,
    "deadline": "2026-09-12T18:00:00",
    "charging_rate_kw": 11.0,
    "preference": "greenest"
  }'
```

### `GET /api/sessions/{id}`
Retrieve a specific session.
```bash
curl http://localhost:8000/api/sessions/ses_123
```

### `GET /api/schedule`
Full StationState snapshot for the operator dashboard:
- `ports` (Port 1 & Port 2 status and power limits)
- `active_sessions` (scheduled, charging, moved sessions)
- `pending_requests`
- `current_signal`
```bash
curl http://localhost:8000/api/schedule
```

### `GET /api/renewable-signal`
24-hour hourly weather and renewable forecast array (Austin demo city).
```bash
curl "http://localhost:8000/api/renewable-signal?city=Austin&hours_ahead=24"
```

### `POST /api/simulate/renewable-drop`
The central hackathon demo event:
- Injects a sudden renewable availability drop (e.g. 86% -> 54%).
- Re-optimizes active flexible sessions (guaranteeing priority EVs are untouched).
- Pushes `PlanChangedEvent` notification over WebSocket to the driver/operator UI.
```bash
curl -X POST http://localhost:8000/api/simulate/renewable-drop \
  -H "Content-Type: application/json" \
  -d '{"new_score": 54.0}'
```

---

## 3. Realtime WebSocket (`/ws/updates`)
Frontend subscribes once to `ws://localhost:8000/ws/updates`.  
Pushes two message types:
1. `PlanChangedEvent`:
```json
{
  "type": "plan_changed",
  "session_id": "ses_4a2f8b",
  "old_window": { "start": "2026-09-12T13:30:00", "end": "2026-09-12T15:30:00" },
  "new_window": { "start": "2026-09-12T15:15:00", "end": "2026-09-12T17:15:00" },
  "reason": "Adapted to 15:15 — shifted away from grid dip to capture cleaner solar peak",
  "timestamp": "2026-09-12T13:30:00"
}
```
2. `SessionUpdateMessage`:
```json
{
  "type": "session_update",
  "session": { ... }
}
```

---

## 4. Swapping Stubs for Real Modules
To plug in Tanvi's Scheduler or Vanshi's Forecasting module, edit only these two lines in `backend/app/routes/api.py`:

```python
# Scheduler swap:
from backend.app.scheduler.engine import build_schedule, reoptimize

# Forecasting swap:
from backend.app.forecasting.weather import get_renewable_signal, trigger_renewable_drop
```

---

## 5. Running Automated Tests
```powershell
backend/.venv/Scripts/python -m pytest backend/tests/ -v
```
