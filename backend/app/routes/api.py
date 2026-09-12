import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from backend.app.models import (
    EVRequestCreate,
    EVRequest,
    Session,
    Port,
    RenewableSignal,
    StationState,
    RenewableDropPayload,
    PlanChangedEvent,
    TimeWindow,
    GenericOkResponse
)
from backend.app import db
from backend.app.ws import manager

# --- Modular Imports for Scheduler and Forecasting ---
# Tanvi's real Scheduler engine:
from backend.app.scheduler.engine import build_schedule, reoptimize, get_port_queues
from backend.app.scheduler.models import Session as SchedulerSession
# Vanshi's real Forecasting & Simulation engine:
from backend.app.forecasting.signal import get_renewable_signal
from backend.app.forecasting.simulate import trigger_renewable_drop, get_current_signal


def _to_pydantic_session(s) -> Session:
    if isinstance(s, Session):
        return s
    if hasattr(s, "to_dict"):
        return Session(**s.to_dict())
    return Session(**dict(s))


def _to_pydantic_signal(item) -> RenewableSignal:
    if isinstance(item, RenewableSignal):
        return item
    return RenewableSignal(**item)


def _get_active_signals(city: str = "ahmedabad", hours_ahead: int = 24) -> list[RenewableSignal]:
    try:
        raw = get_current_signal(city=city)
        if not raw:
            raw = get_renewable_signal(city=city, hours_ahead=hours_ahead)
    except Exception:
        raw = get_renewable_signal(city=city, hours_ahead=hours_ahead)
    return [_to_pydantic_signal(item) for item in raw]


router = APIRouter(prefix="/api")


@router.post("/ev-requests", response_model=Session, status_code=201)
async def create_ev_request(req_in: EVRequestCreate):
    """
    Accepts an EV charging request, invokes scheduler, saves state,
    broadcasts update to connected WebSocket clients, and returns the scheduled Session.
    """
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ev_id = f"ev_{uuid.uuid4().hex[:8]}"
    
    # Validate SOC Range
    if req_in.current_soc >= req_in.target_soc:
        raise HTTPException(
            status_code=400,
            detail="Invalid SOC Range: Target SOC must be strictly greater than Current SOC."
        )

    ev_req = EVRequest(
        id=ev_id,
        vehicle_class=req_in.vehicle_class,
        current_soc=req_in.current_soc,
        target_soc=req_in.target_soc,
        deadline=req_in.deadline,
        charging_rate_kw=req_in.charging_rate_kw,
        preference=req_in.preference,
        created_at=req_in.created_at or now_iso
    )

    # Fetch current ports, active sessions, and weather signal
    ports = db.get_ports()
    active_sessions = db.get_active_sessions()
    signal = _get_active_signals()
    
    # Run real scheduler engine with existing active sessions for conflict-free multi-port allocation
    raw_sessions = build_schedule([ev_req], ports, signal, existing_sessions=active_sessions)
    if not raw_sessions:
        # Deliberately NOT persisted: the driver is told this request failed, so it must not
        # linger as an unresolvable "ghost" entry in the operator's pending-requests queue.
        raise HTTPException(
            status_code=400,
            detail="Could not allocate charging slot: hard constraints (deadline/capacity) violated"
        )

    # Only persist the request once scheduling has actually succeeded.
    db.save_ev_request(ev_req)

    session = _to_pydantic_session(raw_sessions[0])
    db.save_session(session)
    
    # Update port status in DB to occupied with current_session_id
    target_port = next((p for p in ports if p.id == session.port_id), None)
    if target_port:
        target_port.status = "occupied"
        target_port.current_session_id = session.id
        db.update_port(target_port)
    
    # Broadcast session_update over WebSocket
    await manager.broadcast_json({
        "type": "session_update",
        "session": session.model_dump()
    })
    
    return session


@router.get("/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str):
    """
    Retrieves a specific charging session by ID.
    """
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return session


@router.get("/schedule", response_model=StationState)
async def get_schedule():
    """
    Returns full station state snapshot: ports, active sessions,
    pending requests, and current renewable signal.
    """
    active_sessions = db.get_active_sessions()
    ports = db.get_ports_with_live_status(active_sessions)
    pending_requests = db.get_pending_ev_requests()
    signals = _get_active_signals()
    current_signal = signals[0] if signals else RenewableSignal(
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        solar_irradiance=0.0,
        wind_speed=0.0,
        temperature=20.0,
        renewable_score=50.0,
        price_signal=0.15,
        carbon_intensity=250.0
    )
    
    return StationState(
        ports=ports,
        active_sessions=active_sessions,
        pending_requests=pending_requests,
        current_signal=current_signal
    )


@router.get("/schedule/queues")
async def get_port_queues_endpoint():
    """
    Returns separate, chronologically sorted queues for Port 1 and Port 2.
    """
    active_sessions = db.get_active_sessions()
    sched_sessions = [SchedulerSession(**s.model_dump()) for s in active_sessions]
    raw_queues = get_port_queues(sched_sessions)
    return {
        port_id: [_to_pydantic_session(s) for s in sessions]
        for port_id, sessions in raw_queues.items()
    }


@router.get("/renewable-signal", response_model=list[RenewableSignal])
async def get_signal_endpoint(
    city: str = Query(default="ahmedabad", description="Demo city name"),
    hours_ahead: int = Query(default=24, ge=1, le=48, description="Forecast horizon")
):
    """
    Returns 24-hour renewable availability, price, and carbon intensity signals.
    """
    return _get_active_signals(city=city, hours_ahead=hours_ahead)


@router.post("/simulate/renewable-drop", response_model=GenericOkResponse)
async def simulate_renewable_drop(payload: RenewableDropPayload):
    """
    In-memory simulation endpoint:
    1. Triggers the renewable availability drop.
    2. Runs reoptimize() on active flexible sessions (protecting priority EVs).
    3. Persists changed sessions.
    4. Pushes PlanChangedEvent to all WebSocket clients.
    """
    # 1. Update signal state via simulation hook
    trigger_renewable_drop(new_score=payload.new_score)
    updated_signal = _get_active_signals()
    
    # 2. Re-optimize active sessions
    active_sessions = db.get_active_sessions()
    ev_requests_map = {r.id: r for r in db.get_ev_requests()}
    
    # Store old windows before mutation
    old_windows = {s.id: (s.start_time, s.end_time) for s in active_sessions}
    
    sched_sessions = [SchedulerSession(**s.model_dump()) for s in active_sessions]
    raw_changed = reoptimize(sched_sessions, updated_signal, requests_map=ev_requests_map)
    
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for raw in raw_changed:
        changed = _to_pydantic_session(raw)
        db.update_session(changed)
        
        old_start, old_end = old_windows.get(changed.id, (changed.start_time, changed.end_time))
        
        event = PlanChangedEvent(
            type="plan_changed",
            session_id=changed.id,
            old_window=TimeWindow(start=old_start, end=old_end),
            new_window=TimeWindow(start=changed.start_time, end=changed.end_time),
            reason=changed.reason,
            timestamp=now_iso
        )
        
        # Broadcast PlanChangedEvent
        await manager.broadcast_json(event.model_dump())
        # Also broadcast session_update so operator port cards update
        await manager.broadcast_json({
            "type": "session_update",
            "session": changed.model_dump()
        })
        
    return GenericOkResponse(ok=True)
