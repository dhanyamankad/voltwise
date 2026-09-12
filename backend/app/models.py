from typing import Literal, Optional
from pydantic import BaseModel, Field


class EVRequestCreate(BaseModel):
    vehicle_class: Literal["normal", "priority"] = Field(
        default="normal",
        description="priority = ambulance/fleet/delivery, normal = consumer EV"
    )
    current_soc: float = Field(..., ge=0, le=100, description="Current SOC percentage 0-100")
    target_soc: float = Field(..., ge=0, le=100, description="Target SOC percentage 0-100")
    deadline: str = Field(..., description="ISO 8601 datetime, ready by")
    charging_rate_kw: float = Field(default=11.0, gt=0, description="Vehicle max charge rate kW")
    preference: Literal["balanced", "cheapest", "greenest"] = Field(
        default="balanced",
        description="Driver preference for scheduling"
    )
    created_at: Optional[str] = Field(default=None, description="ISO 8601 datetime, optional at creation")


class EVRequest(EVRequestCreate):
    id: str = Field(..., description="Unique EV Request ID (e.g. ev_123)")
    created_at: str = Field(..., description="ISO 8601 datetime")


class Session(BaseModel):
    id: str = Field(..., description="Unique Session ID (e.g. ses_123)")
    ev_id: str = Field(..., description="Reference to EVRequest ID")
    port_id: Literal["port_1", "port_2"] = Field(..., description="Assigned charging port")
    start_time: str = Field(..., description="ISO 8601 datetime start")
    end_time: str = Field(..., description="ISO 8601 datetime end")
    status: Literal["scheduled", "charging", "completed", "moved", "cancelled"] = Field(
        default="scheduled"
    )
    price_estimate: float = Field(..., description="Estimated cost in currency units")
    green_score: float = Field(..., ge=0, le=100, description="Greenness score 0-100")
    co2_estimate_kg: float = Field(..., description="Estimated CO2 footprint in kg")
    reason: str = Field(..., description="Human-readable explanation of why this window was selected")
    version: int = Field(default=1, description="Version counter incremented on rescheduling")


class Port(BaseModel):
    id: Literal["port_1", "port_2"] = Field(...)
    status: Literal["idle", "occupied"] = Field(default="idle")
    power_limit_kw: float = Field(default=50.0, description="Port max output power in kW")
    current_session_id: Optional[str] = Field(default=None)


class RenewableSignal(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 hourly timestamp")
    solar_irradiance: float = Field(..., description="Solar irradiance W/m²")
    wind_speed: float = Field(..., description="Wind speed m/s")
    temperature: float = Field(..., description="Temperature in °C")
    renewable_score: float = Field(..., ge=0, le=100, description="Derived renewable availability score 0-100")
    price_signal: float = Field(..., description="Relative electricity price index")
    carbon_intensity: float = Field(..., description="Relative grid carbon intensity index")


class TimeWindow(BaseModel):
    start: str = Field(..., description="ISO 8601 start")
    end: str = Field(..., description="ISO 8601 end")


class PlanChangedEvent(BaseModel):
    type: Literal["plan_changed"] = "plan_changed"
    session_id: str
    old_window: TimeWindow
    new_window: TimeWindow
    reason: str
    timestamp: str


class SessionUpdateMessage(BaseModel):
    type: Literal["session_update"] = "session_update"
    session: Session


class StationState(BaseModel):
    ports: list[Port]
    active_sessions: list[Session]
    pending_requests: list[EVRequest] = []
    current_signal: RenewableSignal



class RenewableDropPayload(BaseModel):
    new_score: float = Field(..., ge=0, le=100, description="New renewable score after drop event")


class GenericOkResponse(BaseModel):
    ok: bool = True
