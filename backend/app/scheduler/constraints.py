"""
VoltWise Hard Constraints Module

Enforces non-negotiable operational requirements:
1. Port Capacity: Maximum 1 active EV per port at any time slot.
2. Deadline Compliance: Required SOC energy must be delivered before or at vehicle deadline.
3. Priority Fleet Protection: Priority vehicles (ambulance/emergency/fleet) are scheduled first
   and are locked against rescheduling or bumping by normal vehicles.
4. Power & Rate Limits: Charging power cannot exceed vehicle max rate or port power limit.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Tuple, Optional, Dict, Any
from .models import EVRequest, Port, Session, VehicleClass


DEFAULT_BATTERY_CAPACITY_KWH = 60.0  # Standard EV battery size fallback in kWh


def parse_iso_datetime(dt_str: str) -> datetime:
    """Parses ISO 8601 datetime strings robustly, standardizing on naive UTC datetimes."""
    if not dt_str:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    cleaned = dt_str.replace("Z", "+00:00").strip()
    try:
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        pass

    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(cleaned.split("+")[0].split(".")[0], fmt)
        except ValueError:
            continue

    return datetime.utcnow()


def format_iso_datetime(dt: datetime) -> str:
    """Formats datetime to ISO 8601 string."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def calculate_charging_duration_hours(
    current_soc: float,
    target_soc: float,
    charging_rate_kw: float,
    port_power_limit_kw: float,
    battery_capacity_kwh: float = DEFAULT_BATTERY_CAPACITY_KWH
) -> float:
    """
    Calculates required charging duration in hours.
    Duration = Energy Required (kWh) / Effective Charging Rate (kW).
    """
    soc_delta = max(0.0, target_soc - current_soc)
    if soc_delta <= 0.0:
        return 0.0

    energy_required_kwh = (soc_delta / 100.0) * battery_capacity_kwh
    effective_rate_kw = min(charging_rate_kw, port_power_limit_kw)
    if effective_rate_kw <= 0:
        effective_rate_kw = 50.0  # Safe fallback

    raw_duration = energy_required_kwh / effective_rate_kw
    # Enforce minimum charging duration floor of 5 minutes (0.083 hours) for small SOC deltas
    return max(0.083, raw_duration)


def is_port_available(
    port_id: str,
    start_dt: datetime,
    end_dt: datetime,
    existing_sessions: List[Session],
    ignore_session_id: Optional[str] = None
) -> bool:
    """
    Checks if a port is free of overlapping scheduled or active sessions.
    """
    for session in existing_sessions:
        if session.status in ("cancelled", "completed"):
            continue
        if session.port_id != port_id:
            continue
        if ignore_session_id and session.id == ignore_session_id:
            continue

        s_start = parse_iso_datetime(session.start_time)
        s_end = parse_iso_datetime(session.end_time)

        # Overlap check: [start_dt, end_dt) overlaps [s_start, s_end)
        if max(start_dt, s_start) < min(end_dt, s_end):
            return False

    return True


def is_deadline_respected(end_dt: datetime, deadline_str: str) -> bool:
    """
    Verifies if scheduled completion time is on or before the deadline.
    """
    deadline_dt = parse_iso_datetime(deadline_str)
    return end_dt <= deadline_dt


def is_session_locked(session: Session, requests_map: Dict[str, EVRequest]) -> bool:
    """
    Determines if a session is immutable (locked against re-optimization).
    Sessions are locked if:
    - Status is 'charging' or 'completed'
    - Associated EVRequest is 'priority' (e.g., ambulance/emergency)
    """
    if session.status in ("charging", "completed"):
        return True

    ev_req = requests_map.get(session.ev_id)
    if ev_req and ev_req.vehicle_class == "priority":
        return True

    return False
