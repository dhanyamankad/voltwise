"""
VoltWise Test Fixtures for Hackathon Demo & Unit Testing

Includes realistic scenarios:
- 3 Normal EVs competing for 2 ports
- Priority Ambulance + 2 normal EVs
- Renewable availability drop simulation (1:30 PM drop from 86% to 54%)
"""

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
    Returns 24-hour renewable signal profile.
    Peak solar/renewable availability around 12:00 - 16:00.
    """
    signals = []
    base_date = "2026-09-12"

    hourly_profiles = [
        # (hour, renewable_score, price_signal, carbon_intensity)
        (0, 30.0, 8.0, 350.0),
        (1, 28.0, 7.5, 360.0),
        (2, 25.0, 7.0, 380.0),
        (3, 25.0, 7.0, 380.0),
        (4, 30.0, 7.2, 350.0),
        (5, 40.0, 8.0, 300.0),
        (6, 50.0, 9.0, 250.0),
        (7, 60.0, 10.0, 200.0),
        (8, 65.0, 11.0, 180.0),
        (9, 75.0, 10.0, 140.0),
        (10, 82.0, 9.0, 110.0),
        (11, 88.0, 8.0, 90.0),
        (12, 92.0, 7.0, 70.0),   # Peak Solar
        (13, 90.0, 7.2, 80.0),
        (14, 86.0, 7.5, 95.0),
        (15, 84.0, 8.0, 105.0),
        (16, 78.0, 9.0, 130.0),
        (17, 68.0, 11.0, 170.0),
        (18, 55.0, 14.0, 220.0),  # Evening Peak Grid Stress
        (19, 45.0, 15.0, 270.0),
        (20, 40.0, 13.0, 300.0),
        (21, 35.0, 11.0, 320.0),
        (22, 32.0, 9.5, 340.0),
        (23, 30.0, 8.5, 350.0),
    ]

    for hr, green, price, carbon in hourly_profiles:
        timestamp_str = f"{base_date}T{hr:02d}:00:00Z"
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
    Simulates a sudden cloud cover/drop at 1:30 PM (13:30),
    dropping renewable score from 90% down to 54% between 13:00 and 16:00.
    """
    signals = get_renewable_signal_baseline()
    for s in signals:
        if "T13:00:00" in s.timestamp or "T14:00:00" in s.timestamp or "T15:00:00" in s.timestamp:
            s.renewable_score = 54.0
            s.price_signal = 12.0
            s.carbon_intensity = 240.0
    return signals


def scenario_three_normal_evs() -> Tuple[List[EVRequest], List[Port], List[RenewableSignal]]:
    """Scenario 1: 3 normal EVs competing for 2 ports."""
    reqs = [
        EVRequest(
            id="EV-A",
            vehicle_class="normal",
            current_soc=20.0,
            target_soc=80.0,
            deadline="2026-09-12T18:00:00Z",
            charging_rate_kw=50.0,
            preference="greenest",
            created_at="2026-09-12T08:00:00Z"
        ),
        EVRequest(
            id="EV-B",
            vehicle_class="normal",
            current_soc=30.0,
            target_soc=90.0,
            deadline="2026-09-12T19:00:00Z",
            charging_rate_kw=50.0,
            preference="cheapest",
            created_at="2026-09-12T08:30:00Z"
        ),
        EVRequest(
            id="EV-D",
            vehicle_class="normal",
            current_soc=10.0,
            target_soc=70.0,
            deadline="2026-09-12T16:00:00Z",
            charging_rate_kw=50.0,
            preference="balanced",
            created_at="2026-09-12T09:00:00Z"
        ),
    ]
    return reqs, get_default_ports(), get_renewable_signal_baseline()


def scenario_priority_ambulance() -> Tuple[List[EVRequest], List[Port], List[RenewableSignal]]:
    """Scenario 2: 1 Priority Ambulance + 2 Normal EVs."""
    reqs = [
        EVRequest(
            id="EV-A",
            vehicle_class="normal",
            current_soc=20.0,
            target_soc=80.0,
            deadline="2026-09-12T18:00:00Z",
            charging_rate_kw=50.0,
            preference="greenest",
            created_at="2026-09-12T08:00:00Z"
        ),
        EVRequest(
            id="EV-C",
            vehicle_class="priority",  # Ambulance / Emergency Vehicle
            current_soc=15.0,
            target_soc=95.0,
            deadline="2026-09-12T12:00:00Z",
            charging_rate_kw=50.0,
            preference="balanced",
            created_at="2026-09-12T08:00:00Z"
        ),
        EVRequest(
            id="EV-B",
            vehicle_class="normal",
            current_soc=40.0,
            target_soc=80.0,
            deadline="2026-09-12T20:00:00Z",
            charging_rate_kw=50.0,
            preference="cheapest",
            created_at="2026-09-12T09:00:00Z"
        ),
    ]
    return reqs, get_default_ports(), get_renewable_signal_baseline()
