import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

# Use a temporary test database
os.environ["VOLTWISE_DB_PATH"] = os.path.join(os.path.dirname(__file__), "test_voltwise.db")

from backend.app.main import app
from backend.app import db
# NOTE: test_priority_ev_protection below exercises the scheduler directly (not via HTTP),
# so it must import the REAL production engine — the scheduler.models dataclasses are what
# that engine actually expects. This used to import from `scheduler_stub` (an old placeholder
# the app no longer runs) and `backend.app.models` (the pydantic API-layer models), so it was
# silently testing throwaway code instead of the real priority-protection logic.
from backend.app.scheduler.models import EVRequest, Port, Session, RenewableSignal
from backend.app.scheduler.engine import build_schedule, reoptimize


@pytest.fixture(autouse=True)
def setup_teardown():
    db.init_db()
    yield
    # Cleanup test db
    test_db = os.environ["VOLTWISE_DB_PATH"]
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except Exception:
            pass


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "VoltWise Adaptive EV Charging API"
    assert data["status"] == "operational"


def test_get_renewable_signal(client):
    response = client.get("/api/renewable-signal?city=Austin&hours_ahead=24")
    assert response.status_code == 200
    signals = response.json()
    assert len(signals) == 24
    first = signals[0]
    assert "timestamp" in first
    assert "renewable_score" in first
    assert "price_signal" in first
    assert "carbon_intensity" in first
    assert 0 <= first["renewable_score"] <= 100


def test_create_ev_request_and_get_session(client):
    deadline = (datetime.now() + timedelta(hours=4)).isoformat()
    payload = {
        "vehicle_class": "normal",
        "current_soc": 30.0,
        "target_soc": 80.0,
        "deadline": deadline,
        "charging_rate_kw": 11.0,
        "preference": "greenest"
    }
    
    # 1. Post request
    post_res = client.post("/api/ev-requests", json=payload)
    assert post_res.status_code == 201
    session_data = post_res.json()
    
    assert "id" in session_data
    assert session_data["port_id"] in ("port_1", "port_2")
    assert session_data["status"] == "scheduled"
    assert session_data["green_score"] > 0
    assert "reason" in session_data
    assert session_data["version"] == 1
    
    session_id = session_data["id"]
    
    # 2. Get session
    get_res = client.get(f"/api/sessions/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == session_id


def test_get_schedule_station_state(client):
    response = client.get("/api/schedule")
    assert response.status_code == 200
    data = response.json()
    
    assert "ports" in data
    assert len(data["ports"]) == 2
    assert "active_sessions" in data
    assert "pending_requests" in data
    assert "current_signal" in data


def test_simulate_renewable_drop_and_reoptimization(client):
    # Create a flexible session
    deadline = (datetime.now() + timedelta(hours=6)).isoformat()
    client.post("/api/ev-requests", json={
        "vehicle_class": "normal",
        "current_soc": 35.0,
        "target_soc": 85.0,
        "deadline": deadline,
        "charging_rate_kw": 11.0,
        "preference": "greenest"
    })
    
    # Simulate drop
    sim_res = client.post("/api/simulate/renewable-drop", json={"new_score": 54.0})
    assert sim_res.status_code == 200
    assert sim_res.json()["ok"] is True
    
    # Verify session was updated to 'moved' and version incremented
    sched_res = client.get("/api/schedule")
    sessions = sched_res.json()["active_sessions"]
    assert any(s["status"] == "moved" and s["version"] >= 2 for s in sessions)


def test_priority_ev_protection():
    now = datetime.now()
    ports = [Port(id="port_1", status="idle", power_limit_kw=50.0), Port(id="port_2", status="idle", power_limit_kw=50.0)]
    signal = [RenewableSignal(
        timestamp=now.isoformat(),
        solar_irradiance=500.0,
        wind_speed=5.0,
        temperature=25.0,
        renewable_score=80.0,
        price_signal=0.12,
        carbon_intensity=120.0
    )]
    
    # 1 Priority EV + 1 Normal EV
    requests = [
        EVRequest(
            id="ev_prio",
            vehicle_class="priority",
            current_soc=20.0,
            target_soc=90.0,
            deadline=(now + timedelta(hours=2)).isoformat(),
            charging_rate_kw=22.0,
            preference="balanced",
            created_at=now.isoformat()
        ),
        EVRequest(
            id="ev_norm",
            vehicle_class="normal",
            current_soc=30.0,
            target_soc=80.0,
            deadline=(now + timedelta(hours=5)).isoformat(),
            charging_rate_kw=11.0,
            preference="balanced",
            created_at=now.isoformat()
        )
    ]
    
    sessions = build_schedule(requests, ports, signal)
    priority_session = next(s for s in sessions if s.ev_id == "ev_prio")
    assert "priority" in priority_session.reason.lower()
    
    # Re-optimize with drop
    updated_signal = [RenewableSignal(
        timestamp=now.isoformat(),
        solar_irradiance=100.0,
        wind_speed=3.0,
        temperature=22.0,
        renewable_score=40.0,
        price_signal=0.22,
        carbon_intensity=380.0
    )]
    changed = reoptimize(sessions, updated_signal)
    
    # PRIORITY EV MUST NEVER APPEAR IN REOPTIMIZE OUTPUT
    assert all(s.id != priority_session.id for s in changed)
    assert all("priority" not in s.reason.lower() for s in changed)


def test_websocket_connection(client):
    with client.websocket_connect("/ws/updates") as ws:
        # Ping websocket
        ws.send_text("ping")


def test_port_returns_to_idle_after_session_ends(client):
    """
    Regression test: a port's live status must be derived from whether it currently has
    an active session, not from the stored 'occupied' flag written at booking time — that
    flag was never being reset, so a port stayed 'occupied' forever after its first use.
    """
    from backend.app.models import EVRequest as DbEVRequest, Session as DbSession
    from datetime import timezone

    now = datetime.now(timezone.utc)
    req = DbEVRequest(
        id="ev_finished", vehicle_class="normal", current_soc=20.0, target_soc=80.0,
        deadline=(now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        charging_rate_kw=50.0, preference="balanced",
        created_at=(now - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    db.save_ev_request(req)
    finished_session = DbSession(
        id="session_ev_finished", ev_id="ev_finished", port_id="port_1",
        start_time=(now - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        end_time=(now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        status="scheduled", price_estimate=5.0, green_score=80.0, co2_estimate_kg=1.0,
        reason="test", version=1,
    )
    db.save_session(finished_session)
    port = next(p for p in db.get_ports() if p.id == "port_1")
    port.status = "occupied"
    port.current_session_id = finished_session.id
    db.update_port(port)

    response = client.get("/api/schedule")
    port_1 = next(p for p in response.json()["ports"] if p["id"] == "port_1")
    assert port_1["status"] == "idle", "Port should be idle once its only session has ended"
    assert port_1["current_session_id"] is None


def test_rejected_request_does_not_leak_into_pending_queue(client):
    """
    Regression test: an EV request the scheduler cannot satisfy must not be persisted, since
    the driver already received a 400 error — otherwise it lingers forever as an unresolvable
    "ghost" entry in the operator's pending-requests queue.
    """
    deadline = (datetime.now() + timedelta(minutes=1)).isoformat()
    response = client.post("/api/ev-requests", json={
        "vehicle_class": "normal",
        "current_soc": 10.0,
        "target_soc": 95.0,
        "deadline": deadline,
        "charging_rate_kw": 50.0,
        "preference": "balanced",
    })
    assert response.status_code == 400

    schedule = client.get("/api/schedule").json()
    assert schedule["pending_requests"] == []
