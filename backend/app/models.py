"""
VoltWise Backend API Pydantic Models

Matches exact data models specified in docs/00-API-Contract.md §1.
"""

from typing import Literal, Optional, List
from pydantic import BaseModel, Field


VehicleClass = Literal["normal", "priority"]
PreferenceType = Literal["balanced", "cheapest", "greenest"]
SessionStatus = Literal["scheduled", "charging", "completed", "moved", "cancelled"]
PortId = Literal["port_1", "port_2"]
PortStatus = Literal["idle", "occupied"]


class EVCreateRequest(BaseModel):
    vehicle_class: VehicleClass = "normal"
    current_soc: float = Field(..., ge=0.0, le=100.0, description="Current SOC percentage")
    target_soc: float = Field(..., ge=0.0, le=100.0, description="Target SOC percentage")
    deadline: str = Field(..., description="ISO 8601 ready by deadline")
    charging_rate_kw: float = Field(50.0, gt=0.0, description="Vehicle max charge rate in kW")
    preference: PreferenceType = "balanced"

    def check_soc_range(self):
        if self.target_soc <= self.current_soc:
            raise ValueError("Target SOC must be strictly greater than current SOC.")



class EVRequestModel(EVCreateRequest):
    id: str
    created_at: str


class SessionModel(BaseModel):
    id: str
    ev_id: str
    port_id: PortId
    start_time: str
    end_time: str
    status: SessionStatus = "scheduled"
    price_estimate: float = 0.0
    green_score: float = 0.0
    co2_estimate_kg: float = 0.0
    reason: str = ""
    version: int = 1


class PortModel(BaseModel):
    id: PortId
    status: PortStatus = "idle"
    power_limit_kw: float = 50.0
    current_session_id: Optional[str] = None


class RenewableSignalModel(BaseModel):
    timestamp: str
    solar_irradiance: float
    wind_speed: float
    temperature: float
    renewable_score: float
    price_signal: float
    carbon_intensity: float


class PlanChangedEvent(BaseModel):
    type: Literal["plan_changed"] = "plan_changed"
    session_id: str
    old_window: dict  # {"start": str, "end": str}
    new_window: dict  # {"start": str, "end": str}
    reason: str
    timestamp: str


class RenewableDropRequest(BaseModel):
    new_score: float = Field(54.0, ge=0.0, le=100.0)


class StationState(BaseModel):
    ports: List[PortModel]
    active_sessions: List[SessionModel]
    pending_requests: List[EVRequestModel]
    current_signal: RenewableSignalModel
