"""
VoltWise Demo Seed Script
Populates SQLite with 2 ports, initial sample EV requests, and scheduled sessions
matching the HackOut'26 pitch scenario.
"""
from datetime import datetime, timedelta
from backend.app import db
from backend.app.models import EVRequest, Port, Session
from backend.app.scheduler.engine import build_schedule
from backend.app.forecasting_stub import get_renewable_signal


def seed():
    print("Initializing database...")
    db.init_db()

    now = datetime.now().replace(microsecond=0)

    # 1. Reset Ports
    ports = [
        Port(id="port_1", status="occupied", power_limit_kw=50.0, current_session_id=None),
        Port(id="port_2", status="idle", power_limit_kw=50.0, current_session_id=None),
    ]
    for p in ports:
        db.update_port(p)

    # 2. Sample EV Requests
    requests = [
        EVRequest(
            id="ev_ambulance_01",
            vehicle_class="priority",
            current_soc=25.0,
            target_soc=90.0,
            deadline=(now + timedelta(hours=3)).isoformat(),
            charging_rate_kw=22.0,
            preference="balanced",
            created_at=now.isoformat()
        ),
        EVRequest(
            id="ev_commuter_02",
            vehicle_class="normal",
            current_soc=35.0,
            target_soc=80.0,
            deadline=(now + timedelta(hours=6)).isoformat(),
            charging_rate_kw=11.0,
            preference="greenest",
            created_at=now.isoformat()
        ),
        EVRequest(
            id="ev_delivery_03",
            vehicle_class="normal",
            current_soc=45.0,
            target_soc=85.0,
            deadline=(now + timedelta(hours=8)).isoformat(),
            charging_rate_kw=11.0,
            preference="cheapest",
            created_at=now.isoformat()
        ),
    ]

    for req in requests:
        db.save_ev_request(req)

    # 3. Schedule Sessions using real scheduler engine
    signal = get_renewable_signal()
    raw_sessions = build_schedule(requests, ports, signal)
    sessions: list[Session] = []
    for raw in raw_sessions:
        s = Session(**raw.to_dict()) if hasattr(raw, "to_dict") else raw
        sessions.append(s)
        db.save_session(s)
        # Link first session to port_1
        if s.port_id == "port_1" and not ports[0].current_session_id:
            ports[0].current_session_id = s.id
            db.update_port(ports[0])

    print("\n[SUCCESS] Seed completed successfully!")
    print(f"  Ports: {len(ports)} (port_1: 50kW, port_2: 50kW)")
    print(f"  Requests seeded: {len(requests)}")
    print(f"  Sessions scheduled: {len(sessions)}")
    for s in sessions:
        print(f"    - Session [{s.id}] on {s.port_id}: {s.start_time[11:16]} - {s.end_time[11:16]} | Score: {s.green_score}% | {s.reason}")


if __name__ == "__main__":
    seed()
