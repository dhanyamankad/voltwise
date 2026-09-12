"""
VoltWise Test Fixtures for Hackathon Demo & Unit Testing

Includes realistic scenarios:
- 3 Normal EVs competing for 2 ports
- Priority Ambulance + 2 normal EVs
- Renewable availability drop simulation (1:30 PM drop from 86% to 54%)
"""

from typing import List, Tuple
from .models import EVRequest, Port, RenewableSignal


from datetime import datetime, timedelta
from typing import List, Tuple
from .models import EVRequest, Port, RenewableSignal


def get_default_ports() -> List[Port]:
    """Returns standard 2-port station configuration."""
    return [
        Port(id="port_1", status="idle", power_limit_kw=50.0),
        Port(id="port_2", status="idle", power_limit_kw=50.0),
    ]


def get_renewable_signal_baseline() -> List[RenewableSignal]:
    """
    Returns 24-hour renewable signal profile starting from current UTC hour.
    Peak solar/renewable availability around 12:00 - 16:00 in profile.
    """
    signals = []
    now_utc = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

    # price_signal is a 0-100 relative price index (see RenewableSignal model / forecasting.signal),
    # NOT a currency amount — the scheduler always converts it via price_signal / 10.0. These values
    # were previously given as small ₹/kWh-like numbers (7-15), which is a different scale from the
    # real forecasting module's output (10-100) and does not exercise realistic pricing in tests.
    hourly_profiles = [
        # (hour_offset, renewable_score, price_signal, carbon_intensity)
        (0, 30.0, 80.0, 350.0),
        (1, 28.0, 75.0, 360.0),
        (2, 25.0, 70.0, 380.0),
        (3, 25.0, 70.0, 380.0),
        (4, 30.0, 72.0, 350.0),
        (5, 40.0, 80.0, 300.0),
        (6, 50.0, 90.0, 250.0),
        (7, 60.0, 100.0, 200.0),
        (8, 65.0, 55.0, 180.0),
        (9, 75.0, 50.0, 140.0),
        (10, 82.0, 45.0, 110.0),
        (11, 88.0, 40.0, 90.0),
        (12, 92.0, 35.0, 70.0),   # Peak Solar
        (13, 90.0, 36.0, 80.0),
        (14, 86.0, 37.5, 95.0),
        (15, 84.0, 40.0, 105.0),
        (16, 78.0, 45.0, 130.0),
        (17, 68.0, 55.0, 170.0),
        (18, 55.0, 70.0, 220.0),  # Evening Peak Grid Stress
        (19, 45.0, 75.0, 270.0),
        (20, 40.0, 65.0, 300.0),
        (21, 35.0, 55.0, 320.0),
        (22, 32.0, 47.5, 340.0),
        (23, 30.0, 42.5, 350.0),
    ]

    for hr, green, price, carbon in hourly_profiles:
        dt = now_utc + timedelta(hours=hr)
        timestamp_str = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        signals.append(
            RenewableSignal(
                timestamp=timestamp_str,
                solar_irradiance=green * 10.0,
                wind_speed=5.5,
                temperature=25.0,
                renewable_score=green,
                price_signal=price,
                carbon_intensity=carbon
            )
        )

    return signals


def get_renewable_signal_drop() -> List[RenewableSignal]:
    """
    Simulates a sudden cloud cover/drop in the active near window,
    dropping renewable score from peak down to 54%.
    """
    signals = get_renewable_signal_baseline()
    for idx, s in enumerate(signals):
        if 1 <= idx <= 4:
            s.renewable_score = 54.0
            s.price_signal = 60.0
            s.carbon_intensity = 240.0
    return signals


def scenario_three_normal_evs() -> Tuple[List[EVRequest], List[Port], List[RenewableSignal]]:
    """Scenario 1: 3 normal EVs competing for 2 ports."""
    now_utc = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    created_str = (now_utc - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    reqs = [
        EVRequest(
            id="EV-A",
            vehicle_class="normal",
            current_soc=20.0,
            target_soc=80.0,
            deadline=(now_utc + timedelta(hours=10)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            charging_rate_kw=50.0,
            preference="greenest",
            created_at=created_str
        ),
        EVRequest(
            id="EV-B",
            vehicle_class="normal",
            current_soc=30.0,
            target_soc=90.0,
            deadline=(now_utc + timedelta(hours=12)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            charging_rate_kw=50.0,
            preference="cheapest",
            created_at=created_str
        ),
        EVRequest(
            id="EV-D",
            vehicle_class="normal",
            current_soc=10.0,
            target_soc=70.0,
            deadline=(now_utc + timedelta(hours=8)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            charging_rate_kw=50.0,
            preference="balanced",
            created_at=created_str
        ),
    ]
    return reqs, get_default_ports(), get_renewable_signal_baseline()


def scenario_priority_ambulance() -> Tuple[List[EVRequest], List[Port], List[RenewableSignal]]:
    """Scenario 2: 1 Priority Ambulance + 2 Normal EVs."""
    now_utc = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    created_str = (now_utc - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    reqs = [
        EVRequest(
            id="EV-A",
            vehicle_class="normal",
            current_soc=20.0,
            target_soc=80.0,
            deadline=(now_utc + timedelta(hours=10)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            charging_rate_kw=50.0,
            preference="greenest",
            created_at=created_str
        ),
        EVRequest(
            id="EV-C",
            vehicle_class="priority",  # Ambulance / Emergency Vehicle
            current_soc=15.0,
            target_soc=95.0,
            deadline=(now_utc + timedelta(hours=4)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            charging_rate_kw=50.0,
            preference="balanced",
            created_at=created_str
        ),
        EVRequest(
            id="EV-B",
            vehicle_class="normal",
            current_soc=40.0,
            target_soc=80.0,
            deadline=(now_utc + timedelta(hours=12)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            charging_rate_kw=50.0,
            preference="cheapest",
            created_at=created_str
        ),
    ]
    return reqs, get_default_ports(), get_renewable_signal_baseline()

