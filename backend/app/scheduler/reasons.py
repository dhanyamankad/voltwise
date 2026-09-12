"""
VoltWise Reason String Generator

Generates clear, human-readable explanations for session schedule assignments
and dynamic re-optimizations for Driver and Operator UIs.
"""

from typing import Optional
from .models import EVRequest, PreferenceType


def generate_schedule_reason(
    start_time_str: str,
    renewable_score: float,
    price_signal: float,
    vehicle_class: str,
    preference: PreferenceType,
    is_rescheduled: bool = False
) -> str:
    """
    Constructs a human-readable explanation for a scheduled session.
    """
    time_part = start_time_str.split("T")[-1][:5] if "T" in start_time_str else start_time_str

    if vehicle_class == "priority":
        return f"Scheduled at {time_part} — Priority vehicle protected, guaranteed deadline compliance."

    action = "Re-optimized to" if is_rescheduled else "Scheduled at"

    if preference == "greenest":
        detail = f"{renewable_score:.0f}% renewable score window"
    elif preference == "cheapest":
        detail = f"lowest grid price index ({price_signal:.2f})"
    else:
        detail = f"{renewable_score:.0f}% renewable, balanced grid cost ({price_signal:.2f})"

    return f"{action} {time_part} — {detail}."


def generate_reoptimization_reason(
    old_start_str: str,
    new_start_str: str,
    old_green_score: float,
    new_green_score: float,
    trigger_cause: str = "Grid renewable availability changed"
) -> str:
    """
    Constructs a reason for WebSocket PlanChangedEvent notifications.
    """
    old_time = old_start_str.split("T")[-1][:5] if "T" in old_start_str else old_start_str
    new_time = new_start_str.split("T")[-1][:5] if "T" in new_start_str else new_start_str

    return (
        f"{trigger_cause}: Shifted session from {old_time} to {new_time} "
        f"(Green score improved from {old_green_score:.0f}% to {new_green_score:.0f}%)."
    )
