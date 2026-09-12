from datetime import datetime, timedelta
from backend.app.models import RenewableSignal

# In-memory signal state for simulation
_override_renewable_score: float | None = None


def trigger_renewable_drop(new_score: float) -> None:
    """
    Simulation hook used by the demo script and the /simulate endpoint.
    Updates the renewable score to simulate a sudden weather / solar cloud cover drop.
    """
    global _override_renewable_score
    _override_renewable_score = float(new_score)


def get_renewable_signal(city: str = "Austin", hours_ahead: int = 24) -> list[RenewableSignal]:
    """
    Stub forecasting module matching 00-API-Contract.md §5.
    Generates realistic 24-hour solar & wind curve with price & carbon signals.
    Replaced by Vanshi's module in backend/app/forecasting/weather.py when ready.
    """
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    signals: list[RenewableSignal] = []

    # Diurnal solar multiplier shape across 24 hours (peak around 12:00-14:00)
    solar_curve = [
        0, 0, 0, 0, 0, 10, 45, 120, 280, 450, 620, 750,
        810, 790, 680, 520, 310, 140, 30, 0, 0, 0, 0, 0
    ]

    for i in range(hours_ahead):
        hour_dt = now + timedelta(hours=i)
        hour_of_day = hour_dt.hour
        solar = float(solar_curve[hour_of_day % 24])
        wind = float(4.5 + (2.0 if hour_of_day in (18, 19, 20, 21, 22) else 0.5))
        temp = float(18.0 + 8.0 * (solar / 850.0))

        # Base renewable score
        base_score = 45.0 + (solar / 850.0) * 45.0 + (wind / 10.0) * 10.0
        score = min(100.0, max(10.0, base_score))

        # Apply simulated drop override if active (especially for current hour)
        if _override_renewable_score is not None and i < 4:
            score = _override_renewable_score

        # Price signal: cheaper when renewables high, expensive at evening peak
        price = 0.18 - (score / 100.0) * 0.08
        if hour_of_day in (17, 18, 19, 20):
            price += 0.09  # Evening peak grid tariff

        # Carbon intensity inverse to renewable score (gCO2/kWh relative index)
        carbon = round(450.0 * (1.0 - (score / 100.0)) + 50.0, 1)

        signals.append(
            RenewableSignal(
                timestamp=hour_dt.isoformat(),
                solar_irradiance=round(solar, 1),
                wind_speed=round(wind, 1),
                temperature=round(temp, 1),
                renewable_score=round(score, 1),
                price_signal=round(price, 4),
                carbon_intensity=carbon
            )
        )

    return signals
