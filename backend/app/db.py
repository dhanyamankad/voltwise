"""
VoltWise SQLite Persistence Layer

Lightweight SQLite database storage for EVRequests, Sessions, and Station Ports.
No heavy ORM dependencies required.
"""

import sqlite3
import json
import os
from typing import List, Optional, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "voltwise.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()

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
                version INTEGER NOT NULL,
                FOREIGN KEY (ev_id) REFERENCES ev_requests(id)
            )
        """)

        # Ports table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ports (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                power_limit_kw REAL NOT NULL,
                current_session_id TEXT
            )
        """)

        # Seed initial 2 ports if empty
        cursor.execute("SELECT COUNT(*) FROM ports")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO ports VALUES ('port_1', 'idle', 50.0, NULL)")
            cursor.execute("INSERT INTO ports VALUES ('port_2', 'idle', 50.0, NULL)")

        conn.commit()


def save_ev_request(req_dict: Dict[str, Any]):
    with get_connection() as conn:
        conn.cursor().execute("""
            INSERT OR REPLACE INTO ev_requests
            (id, vehicle_class, current_soc, target_soc, deadline, charging_rate_kw, preference, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req_dict["id"],
            req_dict["vehicle_class"],
            req_dict["current_soc"],
            req_dict["target_soc"],
            req_dict["deadline"],
            req_dict["charging_rate_kw"],
            req_dict["preference"],
            req_dict["created_at"]
        ))
        conn.commit()


def get_all_ev_requests() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.cursor().execute("SELECT * FROM ev_requests").fetchall()
        return [dict(r) for r in rows]


def save_session(sess_dict: Dict[str, Any]):
    with get_connection() as conn:
        conn.cursor().execute("""
            INSERT OR REPLACE INTO sessions
            (id, ev_id, port_id, start_time, end_time, status, price_estimate, green_score, co2_estimate_kg, reason, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sess_dict["id"],
            sess_dict["ev_id"],
            sess_dict["port_id"],
            sess_dict["start_time"],
            sess_dict["end_time"],
            sess_dict["status"],
            sess_dict["price_estimate"],
            sess_dict["green_score"],
            sess_dict["co2_estimate_kg"],
            sess_dict["reason"],
            sess_dict["version"]
        ))
        conn.commit()


def get_all_sessions() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.cursor().execute("SELECT * FROM sessions").fetchall()
        return [dict(r) for r in rows]


def get_session_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.cursor().execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return dict(row) if row else None


def get_ports() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.cursor().execute("SELECT * FROM ports").fetchall()
        return [dict(r) for r in rows]
