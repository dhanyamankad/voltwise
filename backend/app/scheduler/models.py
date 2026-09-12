"""
VoltWise Scheduler Data Models

Dataclasses matching the exact schemas defined in docs/00-API-Contract.md.
Pure Python implementation with no external framework dependencies.
"""

from dataclasses import dataclass, field, asdict
from typing import Literal, Optional, Dict, Any, List


VehicleClass = Literal["normal", "priority"]
PreferenceType = Literal["balanced", "cheapest", "greenest"]
SessionStatus = Literal["scheduled", "charging", "completed", "moved", "cancelled"]
PortId = Literal["port_1", "port_2"]
PortStatus = Literal["idle", "occupied"]


@dataclass
class EVRequest:
    id: str
    vehicle_class: VehicleClass
    current_soc: float  # 0 to 100 (%)
    target_soc: float   # 0 to 100 (%)
    deadline: str       # ISO 8601 datetime string
    charging_rate_kw: float
    preference: PreferenceType = "balanced"
    created_at: str = "" # ISO 8601 datetime string

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Port:
    id: PortId
    status: PortStatus = "idle"
    power_limit_kw: float = 50.0
    current_session_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RenewableSignal:
    timestamp: str           # ISO 8601 hourly string
    solar_irradiance: float  # W/m²
    wind_speed: float        # m/s
    temperature: float       # °C
    renewable_score: float   # 0-100
    price_signal: float      # Relative price index ($/kWh)
    carbon_intensity: float  # Relative carbon index (gCO2/kWh)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Session:
    id: str
    ev_id: str
    port_id: PortId
    start_time: str      # ISO 8601
    end_time: str        # ISO 8601
    status: SessionStatus = "scheduled"
    price_estimate: float = 0.0
    green_score: float = 0.0
    co2_estimate_kg: float = 0.0
    reason: str = ""
    version: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
