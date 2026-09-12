# VoltWise — Forecasting & Simulation Module

**Owner:** Vanshi Davda (`vanshi` branch)  
**Track:** 04 — Forecasting, Simulation & Deployment  

## Overview

This module is responsible for:
1. Pulling live hourly weather data (solar irradiance, wind speed, ambient temperature) from the Open-Meteo API for **Ahmedabad** (default city) and other supported locations.
2. Deriving normalized `renewable_score` (0–100), `price_signal`, and `carbon_intensity` indicators for the scheduler engine.
3. Providing automatic fallback resilience (`fallback_data.json`) when live weather API endpoints are unreachable or time out.
4. Providing a simulation hook (`trigger_renewable_drop`) to script the live pitch deck demo event (86% → 54% renewable availability drop).

---

## Contract Compliance (`00-API-Contract.md` §5)

### Functions Exposed

```python
def get_renewable_signal(city: str = "Ahmedabad", hours_ahead: int = 24) -> list[dict]:
    """Pulls Open-Meteo weather data and returns 24-hour renewable signal objects."""

def trigger_renewable_drop(new_score: float = 54.0, target_hour_offset: int = 2) -> list[dict]:
    """Simulates a sudden drop in renewable power score for demo re-optimization testing."""
```

### Data Shape

```json
{
  "timestamp": "2026-09-12T12:00:00Z",
  "solar_irradiance": 910.0,
  "wind_speed": 7.0,
  "temperature": 36.5,
  "renewable_score": 88.0,
  "price_signal": 29.0,
  "carbon_intensity": 12.0
}
```

---

## Direct Module Testing

To test signal retrieval, offline fallback, and renewable drop simulation directly:

```bash
python -m backend.app.forecasting.test_forecasting
```
