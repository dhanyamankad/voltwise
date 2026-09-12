import os
import sqlite3
from typing import Optional
from backend.app.models import Port, EVRequest, Session

DB_PATH = os.getenv("VOLTWISE_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "voltwise.db"))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Ports table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ports (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                power_limit_kw REAL NOT NULL,
                current_session_id TEXT
            )
        """)
        
        # EV Requests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ev_requests (
                id TEXT PRIMARY KEY,
                vehicle_class TEXT NOT NULL,
                current_soc REAL NOT NULL,
                target_soc REAL NOT NULL,
                deadline TEXT NOT NULL,
                charging_rate_kw REAL NOT NULL,
                preference TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        
        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                ev_id TEXT NOT NULL,
                port_id TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                status TEXT NOT NULL,
                price_estimate REAL NOT NULL,
                green_score REAL NOT NULL,
                co2_estimate_kg REAL NOT NULL,
                reason TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(ev_id) REFERENCES ev_requests(id)
            )
        """)
        
        # Initialize default 2 ports if not present
        cursor.execute("SELECT COUNT(*) FROM ports")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "INSERT INTO ports (id, status, power_limit_kw, current_session_id) VALUES (?, ?, ?, ?)",
                ("port_1", "idle", 50.0, None)
            )
            cursor.execute(
                "INSERT INTO ports (id, status, power_limit_kw, current_session_id) VALUES (?, ?, ?, ?)",
                ("port_2", "idle", 50.0, None)
            )
        conn.commit()


def clear_db():
    """
    Clears all EV requests and charging sessions, resetting port statuses to idle.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions")
        cursor.execute("DELETE FROM ev_requests")
        cursor.execute("UPDATE ports SET status = 'idle', current_session_id = NULL")
        conn.commit()


def get_ports() -> list[Port]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, status, power_limit_kw, current_session_id FROM ports ORDER BY id")
        rows = cursor.fetchall()
        return [
            Port(
                id=row["id"],
                status=row["status"],
                power_limit_kw=row["power_limit_kw"],
                current_session_id=row["current_session_id"]
            )
            for row in rows
        ]


def update_port(port: Port):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE ports
            SET status = ?, power_limit_kw = ?, current_session_id = ?
            WHERE id = ?
            """,
            (port.status, port.power_limit_kw, port.current_session_id, port.id)
        )
        conn.commit()


def save_ev_request(req: EVRequest):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO ev_requests
            (id, vehicle_class, current_soc, target_soc, deadline, charging_rate_kw, preference, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                req.id,
                req.vehicle_class,
                req.current_soc,
                req.target_soc,
                req.deadline,
                req.charging_rate_kw,
                req.preference,
                req.created_at
            )
        )
        conn.commit()


def get_ev_requests() -> list[EVRequest]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ev_requests ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [
            EVRequest(
                id=row["id"],
                vehicle_class=row["vehicle_class"],
                current_soc=row["current_soc"],
                target_soc=row["target_soc"],
                deadline=row["deadline"],
                charging_rate_kw=row["charging_rate_kw"],
                preference=row["preference"],
                created_at=row["created_at"]
            )
            for row in rows
        ]


def get_pending_ev_requests() -> list[EVRequest]:
    from datetime import datetime, timezone
    from backend.app.scheduler.constraints import parse_iso_datetime
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM ev_requests 
            WHERE id NOT IN (SELECT ev_id FROM sessions)
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        valid = []
        for row in rows:
            req = EVRequest(
                id=row["id"],
                vehicle_class=row["vehicle_class"],
                current_soc=row["current_soc"],
                target_soc=row["target_soc"],
                deadline=row["deadline"],
                charging_rate_kw=row["charging_rate_kw"],
                preference=row["preference"],
                created_at=row["created_at"]
            )
            # Remove requests whose deadline has already passed
            if parse_iso_datetime(req.deadline) >= now_utc:
                valid.append(req)
        return valid


def get_ev_request(req_id: str) -> Optional[EVRequest]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ev_requests WHERE id = ?", (req_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return EVRequest(
            id=row["id"],
            vehicle_class=row["vehicle_class"],
            current_soc=row["current_soc"],
            target_soc=row["target_soc"],
            deadline=row["deadline"],
            charging_rate_kw=row["charging_rate_kw"],
            preference=row["preference"],
            created_at=row["created_at"]
        )


def save_session(session: Session):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO sessions
            (id, ev_id, port_id, start_time, end_time, status, price_estimate, green_score, co2_estimate_kg, reason, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session.id,
                session.ev_id,
                session.port_id,
                session.start_time,
                session.end_time,
                session.status,
                session.price_estimate,
                session.green_score,
                session.co2_estimate_kg,
                session.reason,
                session.version
            )
        )
        conn.commit()


def update_session(session: Session):
    save_session(session)


def get_session(session_id: str) -> Optional[Session]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return Session(
            id=row["id"],
            ev_id=row["ev_id"],
            port_id=row["port_id"],
            start_time=row["start_time"],
            end_time=row["end_time"],
            status=row["status"],
            price_estimate=row["price_estimate"],
            green_score=row["green_score"],
            co2_estimate_kg=row["co2_estimate_kg"],
            reason=row["reason"],
            version=row["version"]
        )


def get_all_sessions() -> list[Session]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions ORDER BY start_time ASC")
        rows = cursor.fetchall()
        return [
            Session(
                id=row["id"],
                ev_id=row["ev_id"],
                port_id=row["port_id"],
                start_time=row["start_time"],
                end_time=row["end_time"],
                status=row["status"],
                price_estimate=row["price_estimate"],
                green_score=row["green_score"],
                co2_estimate_kg=row["co2_estimate_kg"],
                reason=row["reason"],
                version=row["version"]
            )
            for row in rows
        ]


def get_active_sessions() -> list[Session]:
    from datetime import datetime, timezone
    from backend.app.scheduler.constraints import parse_iso_datetime
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE status IN ('scheduled', 'charging', 'moved') ORDER BY start_time ASC")
        rows = cursor.fetchall()
        active = []
        for row in rows:
            sess = Session(
                id=row["id"],
                ev_id=row["ev_id"],
                port_id=row["port_id"],
                start_time=row["start_time"],
                end_time=row["end_time"],
                status=row["status"],
                price_estimate=row["price_estimate"],
                green_score=row["green_score"],
                co2_estimate_kg=row["co2_estimate_kg"],
                reason=row["reason"],
                version=row["version"]
            )
            # Filter out sessions whose end_time has already passed (charged/completed)
            if parse_iso_datetime(sess.end_time) >= now_utc:
                active.append(sess)
        return active


def get_ports_with_live_status(active_sessions: Optional[list[Session]] = None) -> list[Port]:
    """
    Returns ports with status/current_session_id derived from currently active sessions
    that are actively charging right now (start_time <= now_utc <= end_time).
    """
    from datetime import datetime, timezone
    from backend.app.scheduler.constraints import parse_iso_datetime

    ports = get_ports()
    sessions = active_sessions if active_sessions is not None else get_active_sessions()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # Active session currently charging on the port RIGHT NOW
    currently_charging: dict[str, Session] = {}
    for s in sessions:
        start_dt = parse_iso_datetime(s.start_time)
        end_dt = parse_iso_datetime(s.end_time)
        if start_dt <= now_utc <= end_dt:
            currently_charging[s.port_id] = s

    reconciled: list[Port] = []
    for port in ports:
        occupying = currently_charging.get(port.id)
        reconciled.append(
            Port(
                id=port.id,
                status="occupied" if occupying else "idle",
                power_limit_kw=port.power_limit_kw,
                current_session_id=occupying.id if occupying else None,
            )
        )
    return reconciled
