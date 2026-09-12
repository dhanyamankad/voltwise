"""
VoltWise — Simulation Engine
Owner: Vanshi Davda (Track 04)

Scripted event trigger for demo presentation:
Simulates sudden renewable power drop (e.g., sudden cloud cover / wind lull),
mutating active renewable signal state and returning updated signal list.
"""

from typing import List, Dict, Any, Optional
from backend.app.forecasting.signal import get_renewable_signal, DEFAULT_CITY, _calculate_derived_metrics

# Global in-memory signal cache for live stateful simulation
_ACTIVE_SIGNAL_CACHE: Optional[List[Dict[str, Any]]] = None
_ACTIVE_CITY: str = DEFAULT_CITY


def get_current_signal(city: str = DEFAULT_CITY, force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Retrieves current active renewable signal, initializing if necessary."""
    global _ACTIVE_SIGNAL_CACHE, _ACTIVE_CITY
    if _ACTIVE_SIGNAL_CACHE is None or force_refresh or city.lower() != _ACTIVE_CITY.lower():
        _ACTIVE_CITY = city
        _ACTIVE_SIGNAL_CACHE = get_renewable_signal(city=city, hours_ahead=24)
    return [dict(item) for item in _ACTIVE_SIGNAL_CACHE]


def trigger_renewable_drop(
    new_score: float = 54.0,
    target_hour_offset: int = 2,
    duration_hours: int = 6
) -> List[Dict[str, Any]]:
    """
    Simulation hook used by demo script and /api/simulate/renewable-drop endpoint.
    Drops renewable score to `new_score` (e.g. 86% -> 54%) starting at `target_hour_offset`
    for `duration_hours`.
    """
    global _ACTIVE_SIGNAL_CACHE
    current_signal = get_current_signal()

    start_idx = max(0, min(target_hour_offset, len(current_signal) - 1))
    end_idx = min(start_idx + duration_hours, len(current_signal))

    updated_signal = []
    for idx, item in enumerate(current_signal):
        new_item = dict(item)
        if start_idx <= idx < end_idx:
            # Simulate renewable reduction (cloud cover reducing solar irradiance and wind drop)
            ratio = new_score / max(new_item["renewable_score"], 1.0)
            new_item["solar_irradiance"] = round(new_item["solar_irradiance"] * ratio, 1)
            new_item["wind_speed"] = round(new_item["wind_speed"] * ratio, 1)
            new_item["renewable_score"] = float(new_score)

            # Recalculate price and carbon intensity based on lower renewable score
            _, new_price, new_carbon = _calculate_derived_metrics(
                new_item["solar_irradiance"],
                new_item["wind_speed"],
                new_item["temperature"]
            )
            new_item["price_signal"] = new_price
            new_item["carbon_intensity"] = new_carbon

        elif end_idx <= idx < end_idx + 4:
            # Model passing cloud front clearing: high solar recovery window for adaptive slot shifting
            recovery_score = max(new_item["renewable_score"], 84.0)
            ratio = recovery_score / max(new_item["renewable_score"], 1.0)
            new_item["solar_irradiance"] = round(max(new_item["solar_irradiance"], 750.0), 1)
            new_item["wind_speed"] = round(max(new_item["wind_speed"], 6.0), 1)
            new_item["renewable_score"] = recovery_score
            _, new_price, new_carbon = _calculate_derived_metrics(
                new_item["solar_irradiance"],
                new_item["wind_speed"],
                new_item["temperature"]
            )
            new_item["price_signal"] = new_price
            new_item["carbon_intensity"] = new_carbon

        updated_signal.append(new_item)

    _ACTIVE_SIGNAL_CACHE = updated_signal
    print(f"[Simulation] Renewable drop triggered: {new_score}% score applied from hour index {start_idx} to {end_idx-1}.")
    return [dict(item) for item in _ACTIVE_SIGNAL_CACHE]


def reset_signal(city: str = DEFAULT_CITY) -> List[Dict[str, Any]]:
    """Resets simulation back to live weather forecast."""
    return get_current_signal(city=city, force_refresh=True)
