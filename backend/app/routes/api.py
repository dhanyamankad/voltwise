"""
VoltWise REST API Routes

Implements endpoints specified in docs/00-API-Contract.md §2.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any
from datetime import datetime
import uuid

from app.models import (
    EVCreateRequest,
    EVRequestModel,
    SessionModel,
    PortModel,
    RenewableSignalModel,
    StationState,
    RenewableDropRequest,
    PlanChangedEvent
)
from app.db import (
    save_ev_request,
    get_all_ev_requests,
    save_session,
    get_all_sessions,
    get_session_by_id,
    get_ports
)
from app.ws import manager
from app.forecasting_stub import get_renewable_signal, trigger_renewable_drop
from app.scheduler import build_schedule, reoptimize, EVRequest, Port, Session, RenewableSignal

router = APIRouter(prefix="/api")


def _model_to_dict(obj):
    return obj.model_dump() if hasattr(obj, "model_dump") else obj.dict()


@router.post("/ev-requests", response_model=SessionModel)
async def create_ev_request(req: EVCreateRequest):
    """
    POST /api/ev-requests
    Accepts new driver EV charging request, invokes scheduler, persists, and returns assigned Session.
    """
    try:
        req.check_soc_range()
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))

    req_id = f"ev_{uuid.uuid4().hex[:6]}"
    created_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    ev_req = EVRequest(
        id=req_id,
        vehicle_class=req.vehicle_class,
        current_soc=req.current_soc,
        target_soc=req.target_soc,
        deadline=req.deadline,
        charging_rate_kw=req.charging_rate_kw,
        preference=req.preference,
        created_at=created_at
    )
    save_ev_request(ev_req.to_dict())

    # Fetch existing requests, ports, and signal
    all_raw_reqs = get_all_ev_requests()
    all_ev_reqs = [EVRequest(**r) for r in all_raw_reqs]
    raw_ports = get_ports()
    ports = [Port(**p) for p in raw_ports]
    signals = get_renewable_signal()

    # Re-run scheduler for all pending requests
    sessions = build_schedule(all_ev_reqs, ports, signals)

    target_session = None
    for s in sessions:
        save_session(s.to_dict())
        if s.ev_id == req_id:
            target_session = s

    if not target_session:
        raise HTTPException(status_code=400, detail="Could not schedule EV request within given deadline or port constraints.")

    # Broadcast session update over WebSocket
    await manager.broadcast({
        "type": "session_update",
        "session": target_session.to_dict()
    })

    return SessionModel(**target_session.to_dict())


@router.get("/sessions/{session_id}", response_model=SessionModel)
async def get_session(session_id: str):
    """
    GET /api/sessions/{id}
    Retrieves a session by ID.
    """
    sess = get_session_by_id(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return SessionModel(**sess)


@router.get("/schedule", response_model=StationState)
async def get_station_schedule():
    """
    GET /api/schedule
    Returns full StationState snapshot for Operator Dashboard.
    """
    ports_raw = get_ports()
    sessions_raw = get_all_sessions()
    requests_raw = get_all_ev_requests()
    signals = get_renewable_signal()

    ports = [PortModel(**p) for p in ports_raw]
    active_sessions = [SessionModel(**s) for s in sessions_raw if s["status"] in ("scheduled", "charging", "moved")]
    pending_requests = [EVRequestModel(**r) for r in requests_raw]
    current_sig = RenewableSignalModel(**signals[12].to_dict()) if len(signals) > 12 else RenewableSignalModel(**signals[0].to_dict())

    return StationState(
        ports=ports,
        active_sessions=active_sessions,
        pending_requests=pending_requests,
        current_signal=current_sig
    )


@router.get("/renewable-signal", response_model=List[RenewableSignalModel])
async def get_renewable_signals(city: str = "DemoCity"):
    """
    GET /api/renewable-signal?city=
    Returns 24-hour renewable energy signal array.
    """
    signals = get_renewable_signal(city=city)
    return [RenewableSignalModel(**s.to_dict()) for s in signals]


@router.post("/simulate/renewable-drop")
async def simulate_renewable_drop(payload: RenewableDropRequest):
    """
    POST /api/simulate/renewable-drop
    Triggers renewable availability drop event, reoptimizes flexible sessions, updates DB,
    and broadcasts PlanChangedEvent over WebSocket.
    """
    trigger_renewable_drop(new_score=payload.new_score)
    updated_signal = get_renewable_signal()

    raw_sessions = get_all_sessions()
    sessions = [Session(**s) for s in raw_sessions]

    # Reoptimize flexible sessions
    changed_sessions = reoptimize(sessions, updated_signal)

    for sess in changed_sessions:
        save_session(sess.to_dict())

        old_start = getattr(sess, "_old_start_time", sess.start_time)
        old_end = getattr(sess, "_old_end_time", sess.end_time)

        # Broadcast PlanChangedEvent for each rescheduled session
        event = PlanChangedEvent(
            type="plan_changed",
            session_id=sess.id,
            old_window={"start": old_start, "end": old_end},
            new_window={"start": sess.start_time, "end": sess.end_time},
            reason=sess.reason,
            timestamp=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        await manager.broadcast(_model_to_dict(event))

    return {
        "ok": True,
        "message": f"Renewable drop triggered to {payload.new_score}%. Re-optimized {len(changed_sessions)} sessions.",
        "rescheduled_count": len(changed_sessions)
    }

