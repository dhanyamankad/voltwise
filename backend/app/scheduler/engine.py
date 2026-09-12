"""
VoltWise Core Scheduling & Optimization Engine

Implements greedy priority-queue scheduling and dynamic re-optimization logic.
Pure Python module with zero third-party dependencies.
"""

from datetime import datetime, timedelta
import math
from typing import List, Dict, Tuple, Optional

from .models import EVRequest, Port, RenewableSignal, Session
from .constraints import (
    parse_iso_datetime,
    format_iso_datetime,
    calculate_charging_duration_hours,
    is_port_available,
    is_deadline_respected,
    is_session_locked,
    DEFAULT_BATTERY_CAPACITY_KWH,
)
from .reasons import generate_schedule_reason, generate_reoptimization_reason


def _get_signal_at_time(dt: datetime, signals: List[RenewableSignal]) -> Tuple[float, float, float]:
    """
    Interpolates or returns closest RenewableSignal (renewable_score, price_signal, carbon_intensity)
    for a given datetime.
    """
    if not signals:
        return 70.0, 5.0, 150.0  # Fallback default values

    # Sort signals by timestamp
    parsed_signals = []
    for s in signals:
        try:
            s_dt = parse_iso_datetime(s.timestamp)
            parsed_signals.append((s_dt, s))
        except Exception:
            continue

    if not parsed_signals:
        return 70.0, 5.0, 150.0

    parsed_signals.sort(key=lambda x: x[0])

    # If dt before first signal
    if dt <= parsed_signals[0][0]:
        s = parsed_signals[0][1]
        return s.renewable_score, s.price_signal, s.carbon_intensity

    # If dt after last signal
    if dt >= parsed_signals[-1][0]:
        s = parsed_signals[-1][1]
        return s.renewable_score, s.price_signal, s.carbon_intensity

    # Find closest match
    closest_signal = min(parsed_signals, key=lambda x: abs((x[0] - dt).total_seconds()))[1]
    return closest_signal.renewable_score, closest_signal.price_signal, closest_signal.carbon_intensity


def _evaluate_window(
    start_dt: datetime,
    duration_hours: float,
    preference: str,
    signals: List[RenewableSignal],
    charging_rate_kw: float = 50.0
) -> Tuple[float, float, float, float]:
    """
    Evaluates a candidate time window [start_dt, start_dt + duration_hours].
    Returns (composite_score, avg_green_score, total_price_estimate, total_co2_kg).
    """
    steps = max(1, int(math.ceil(duration_hours * 4)))  # 15-minute sampling steps
    step_hours = duration_hours / steps

    total_green = 0.0
    total_price = 0.0
    total_co2 = 0.0

    # Effective energy delivered per 15-min sample step
    energy_kwh = charging_rate_kw * step_hours

    for i in range(steps):
        sample_dt = start_dt + timedelta(hours=i * step_hours)
        green_score, price_sig, carbon_intensity = _get_signal_at_time(sample_dt, signals)

        total_green += green_score
        # Scale 0-100 price signal index to realistic rate (₹/kWh, e.g. 60.0 index -> ₹6.00/kWh)
        price_rate_per_kwh = price_sig / 10.0 if price_sig > 20.0 else price_sig
        total_price += price_rate_per_kwh * energy_kwh
        total_co2 += (carbon_intensity * energy_kwh) / 1000.0  # g to kg

    avg_green = total_green / steps

    # Score calculation based on distinct driver optimization preference
    if preference == "greenest":
        composite_score = (avg_green * 5.0) - (total_price * 0.05)
    elif preference == "cheapest":
        composite_score = 500.0 - (total_price * 3.0) + (avg_green * 0.1)
    else:  # balanced
        composite_score = (avg_green * 2.0) - (total_price * 0.5)

    return composite_score, avg_green, total_price, total_co2


def build_schedule(
    requests: List[EVRequest],
    ports: List[Port],
    signal: List[RenewableSignal],
    existing_sessions: Optional[List[Session]] = None,
) -> List[Session]:
    """
    Computes optimal charging sessions for a list of EV requests against available ports
    and energy signals. Respects deadlines, priority protection, and existing active sessions.
    """
    if not requests or not ports:
        return []

    scheduled_sessions: List[Session] = list(existing_sessions) if existing_sessions else []
    initial_count = len(scheduled_sessions)

    # Separate priority vs normal requests
    priority_reqs = [r for r in requests if r.vehicle_class == "priority"]
    normal_reqs = [r for r in requests if r.vehicle_class != "priority"]

    # Sort priority by earliest deadline first
    priority_reqs.sort(key=lambda r: parse_iso_datetime(r.deadline))

    # Sort normal requests by urgency (slack time = deadline - created_at)
    def slack_key(r: EVRequest) -> float:
        d = parse_iso_datetime(r.deadline)
        c = parse_iso_datetime(r.created_at) if r.created_at else datetime.utcnow()
        return (d - c).total_seconds()

    normal_reqs.sort(key=slack_key)

    sorted_requests = priority_reqs + normal_reqs

    # Determine earliest available start time (must be at or after current UTC time)
    now_utc = datetime.utcnow()
    if signal:
        min_signal_dt = min(parse_iso_datetime(s.timestamp) for s in signal)
        base_start = max(now_utc, min_signal_dt)
    else:
        base_start = now_utc

    for req in sorted_requests:
        created_dt = parse_iso_datetime(req.created_at) if req.created_at else base_start
        search_start = max(base_start, created_dt)
        deadline_dt = parse_iso_datetime(req.deadline)

        best_option = None
        best_score = -float("inf")

        for port in ports:
            duration_hours = calculate_charging_duration_hours(
                req.current_soc,
                req.target_soc,
                req.charging_rate_kw,
                port.power_limit_kw
            )

            if duration_hours <= 0:
                continue

            effective_rate = min(req.charging_rate_kw, port.power_limit_kw)
            max_start_dt = deadline_dt - timedelta(hours=duration_hours)
            if max_start_dt < search_start:
                continue

            # Evaluate 15-minute slot candidates
            current_candidate = search_start
            slot_minutes = 15

            while current_candidate <= max_start_dt:
                candidate_end = current_candidate + timedelta(hours=duration_hours)

                # Hard constraint check: Port availability & Strict Deadline Completion
                if candidate_end <= deadline_dt and is_port_available(port.id, current_candidate, candidate_end, scheduled_sessions):
                    comp_score, avg_green, total_price, total_co2 = _evaluate_window(
                        current_candidate, duration_hours, req.preference, signal, effective_rate
                    )

                    # Priority bonus for emergency/priority vehicles
                    if req.vehicle_class == "priority":
                        comp_score += 1000.0

                    # Load balance across ports: slight preference to less utilized port for identical start times
                    current_port_session_count = sum(1 for s in scheduled_sessions if s.port_id == port.id)
                    adjusted_score = comp_score - (current_port_session_count * 0.5)

                    if adjusted_score > best_score:
                        best_score = adjusted_score
                        best_option = (
                            port.id,
                            current_candidate,
                            candidate_end,
                            avg_green,
                            total_price,
                            total_co2
                        )

                current_candidate += timedelta(minutes=slot_minutes)

        if best_option:
            port_id, start_dt, end_dt, green_score, price_est, co2_est = best_option
            start_str = format_iso_datetime(start_dt)
            end_str = format_iso_datetime(end_dt)

            reason_str = generate_schedule_reason(
                start_str,
                green_score,
                price_est,
                req.vehicle_class,
                req.preference,
                is_rescheduled=False
            )

            # Unique session ID tied to EV request ID
            sess_id = f"session_{req.id}"

            sess = Session(
                id=sess_id,
                ev_id=req.id,
                port_id=port_id,
                start_time=start_str,
                end_time=end_str,
                status="scheduled",
                price_estimate=round(price_est, 2),
                green_score=round(green_score, 1),
                co2_estimate_kg=round(co2_est, 2),
                reason=reason_str,
                version=1
            )
            scheduled_sessions.append(sess)

    return scheduled_sessions[initial_count:]


def reoptimize(
    current_sessions: List[Session],
    updated_signal: List[RenewableSignal],
    requests_map: Optional[Dict[str, EVRequest]] = None,
) -> List[Session]:
    """
    Re-evaluates flexible sessions when energy signals change.
    Returns ONLY the sessions that were modified/moved.
    Priority, in-progress ('charging'), or completed sessions are never modified or returned.
    """
    if not current_sessions or not updated_signal:
        return []

    changed_sessions: List[Session] = []
    working_sessions = list(current_sessions)  # Dynamic working copy to prevent slot overlaps

    req_map = requests_map or {}
    base_start = min(parse_iso_datetime(s.timestamp) for s in updated_signal)

    for session in working_sessions:
        # Hard constraint: Priority sessions or active/completed are untouched (uses is_session_locked)
        if is_session_locked(session, req_map):
            continue

        if "Priority vehicle" in session.reason or "protected" in session.reason.lower():
            continue

        cur_start = parse_iso_datetime(session.start_time)
        cur_end = parse_iso_datetime(session.end_time)
        duration_hours = (cur_end - cur_start).total_seconds() / 3600.0

        # Evaluate current window under new signal
        _, cur_green, cur_price, cur_co2 = _evaluate_window(
            cur_start, duration_hours, "balanced", updated_signal
        )

        best_candidate = None
        best_green = cur_green

        search_dt = max(base_start, cur_start - timedelta(hours=1))
        max_search_dt = cur_start + timedelta(hours=3)

        while search_dt <= max_search_dt:
            candidate_end = search_dt + timedelta(hours=duration_hours)

            # Check port availability against dynamic working_sessions
            if is_port_available(session.port_id, search_dt, candidate_end, working_sessions, ignore_session_id=session.id):
                _, cand_green, cand_price, cand_co2 = _evaluate_window(
                    search_dt, duration_hours, "balanced", updated_signal
                )

                # Require a meaningful improvement (> 5% green score increase) to justify moving
                if cand_green > best_green + 5.0:
                    best_green = cand_green
                    best_candidate = (search_dt, candidate_end, cand_green, cand_price, cand_co2)

            search_dt += timedelta(minutes=15)

        if best_candidate:
            new_start, new_end, new_green, new_price, new_co2 = best_candidate
            new_start_str = format_iso_datetime(new_start)
            new_end_str = format_iso_datetime(new_end)

            old_start_str = session.start_time
            old_end_str = session.end_time

            # Update session properties
            session.start_time = new_start_str
            session.end_time = new_end_str
            session.green_score = round(new_green, 1)
            session.price_estimate = round(new_price, 2)
            session.co2_estimate_kg = round(new_co2, 2)
            session.status = "moved"
            session.version += 1
            session.reason = generate_reoptimization_reason(
                old_start_str,
                new_start_str,
                cur_green,
                new_green,
                trigger_cause="Renewable grid score dropped"
            )

            # Attach temporary attributes for WebSocket event generator
            setattr(session, "_old_start_time", old_start_str)
            setattr(session, "_old_end_time", old_end_str)

            changed_sessions.append(session)

    return changed_sessions


def get_port_queues(sessions: List[Session]) -> Dict[str, List[Session]]:
    """
    Groups active/scheduled sessions into per-port chronological queues.
    Returns dict mapping port_id (e.g. 'port_1', 'port_2') to list of Sessions sorted by start_time.
    """
    queues: Dict[str, List[Session]] = {"port_1": [], "port_2": []}
    for session in sessions:
        if session.status in ("scheduled", "charging", "moved"):
            if session.port_id in queues:
                queues[session.port_id].append(session)
            else:
                queues[session.port_id] = [session]

    for port_id in queues:
        queues[port_id].sort(key=lambda s: parse_iso_datetime(s.start_time))

    return queues

