"""
VoltWise Forecasting Interface / Stub

Matches function signatures in docs/00-API-Contract.md §5.
Integrates weather / renewable signal forecasting with local canned fallback.
"""

from typing import List
from app.scheduler.models import RenewableSignal
from app.scheduler.fixtures import get_renewable_signal_baseline, get_renewable_signal_drop

_current_signal_drop_triggered = False


def get_renewable_signal(city: str = "DemoCity", hours_ahead: int = 24) -> List[RenewableSignal]:
    """
    Returns 24-hour renewable signal.
    Delegates to weather forecasting or canned baseline/drop signal.
    """
    global _current_signal_drop_triggered
    if _current_signal_drop_triggered:
        return get_renewable_signal_drop()
    return get_renewable_signal_baseline()


def trigger_renewable_drop(new_score: float = 54.0) -> None:
    """
    Simulation hook used by the demo script and /api/simulate/renewable-drop endpoint.
    """
    global _current_signal_drop_triggered
    _current_signal_drop_triggered = True
