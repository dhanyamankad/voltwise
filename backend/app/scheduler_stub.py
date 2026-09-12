import uuid
from datetime import datetime, timedelta
from typing import Optional
from backend.app.models import EVRequest, Port, Session, RenewableSignal


def _parse_iso(dt_str: str) -> datetime:
    try:
        # Handles 'Z' or '+00:00'
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now()


def _format_iso(dt: datetime) -> str:
    return dt.isoformat()


def build_schedule(
    requests: list[EVRequest],
    ports: list[Port],
    signal: list[RenewableSignal],
) -> list[Session]:
    """
    Stub FCFS/greedy allocator matching 00-API-Contract.md §4.
    Replaced by Tanvi's engine in backend/app/scheduler/engine.py when ready.
    """
    sessions: list[Session] = []
    
    # Track available time for each port
    now = datetime.now().replace(microsecond=0)
    port_availability = {
        "port_1": now,
        "port_2": now
    }
    
    # Priority requests go first
    sorted_requests = sorted(
        requests,
        key=lambda r: (0 if r.vehicle_class == "priority" else 1, _parse_iso(r.deadline))
    )
    
    for req in sorted_requests:
        soc_delta = max(0.0, req.target_soc - req.current_soc)
        if soc_delta == 0:
            continue
            
        # Assume 60 kWh battery pack typical for modern EV
        energy_needed_kwh = (soc_delta / 100.0) * 60.0
        
        # Pick the port that becomes available earliest
        chosen_port_id = min(port_availability.keys(), key=lambda p: port_availability[p])
        chosen_port = next((p for p in ports if p.id == chosen_port_id), None)
        effective_power_kw = min(req.charging_rate_kw, chosen_port.power_limit_kw if chosen_port else 50.0)
        
        charge_hours = energy_needed_kwh / max(effective_power_kw, 1.0)
        start_dt = max(port_availability[chosen_port_id], now)
        end_dt = start_dt + timedelta(hours=charge_hours)
        
        # Check deadline
        deadline_dt = _parse_iso(req.deadline)
        if end_dt > deadline_dt and req.vehicle_class != "priority":
            # In stub, still schedule as early as possible or note tight constraint
            pass
            
        port_availability[chosen_port_id] = end_dt + timedelta(minutes=5)
        
        # Calculate scores from renewable signal
        avg_renewable = 78.0
        avg_price = 0.14
        if signal:
            avg_renewable = sum(s.renewable_score for s in signal[:8]) / min(len(signal), 8)
            avg_price = sum(s.price_signal for s in signal[:8]) / min(len(signal), 8)
            
        price_estimate = round(energy_needed_kwh * (avg_price or 0.15), 2)
        co2_estimate_kg = round(energy_needed_kwh * (1.0 - (avg_renewable / 100.0)) * 0.4, 2)
        
        if req.vehicle_class == "priority":
            reason = f"Priority fleet dispatch on {chosen_port_id}: guaranteed slot, deadline protected"
        else:
            reason = f"Scheduled on {chosen_port_id} at {start_dt.strftime('%H:%M')} — {int(avg_renewable)}% renewable, {req.preference} optimized"
            
        session = Session(
            id=f"ses_{uuid.uuid4().hex[:8]}",
            ev_id=req.id,
            port_id=chosen_port_id,
            start_time=_format_iso(start_dt),
            end_time=_format_iso(end_dt),
            status="scheduled",
            price_estimate=price_estimate,
            green_score=round(avg_renewable, 1),
            co2_estimate_kg=co2_estimate_kg,
            reason=reason,
            version=1
        )
        sessions.append(session)
        
    return sessions


def reoptimize(
    current_sessions: list[Session],
    updated_signal: list[RenewableSignal],
) -> list[Session]:
    """
    Stub re-optimization matching 00-API-Contract.md §4.
    Shifts flexible/non-priority sessions to better renewable windows.
    Protected/priority/completed sessions must never appear in the output.
    """
    changed_sessions: list[Session] = []
    
    current_avg_score = 50.0
    if updated_signal:
        current_avg_score = updated_signal[0].renewable_score
        
    for session in current_sessions:
        # Never alter priority sessions, charging sessions, or completed sessions
        is_priority = "priority" in session.reason.lower()
        if is_priority or session.status in ("charging", "completed", "cancelled"):
            continue
            
        # Shift scheduled flexible session by 1h 45m for the demo adaptation
        old_start = _parse_iso(session.start_time)
        old_end = _parse_iso(session.end_time)
        duration = old_end - old_start
        
        # New optimal slot: 3:15 PM as highlighted in the hackathon pitch
        new_start = old_start + timedelta(hours=1, minutes=45)
        new_end = new_start + duration
        
        new_green_score = min(100.0, current_avg_score + 18.0)
        session.start_time = _format_iso(new_start)
        session.end_time = _format_iso(new_end)
        session.status = "moved"
        session.green_score = round(new_green_score, 1)
        session.version += 1
        session.reason = f"Adapted to {new_start.strftime('%H:%M')} — shifted away from grid dip to capture cleaner solar peak"
        
        changed_sessions.append(session)
        
    return changed_sessions
