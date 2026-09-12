# VoltWise — Forecasting & Grid Simulation Module

**Track 04 (Vanshi Davda)** — Forecasting, Signal Generation & Simulation Engine (`backend/app/forecasting`).

---

## ⛅ Overview

The Forecasting Module is responsible for:
1. **Live Weather & Grid Data Fetching**: Pulling hourly solar irradiance ($\text{W/m}^2$), wind speed ($\text{m/s}$), and ambient temperature ($\text{°C}$) from the Open-Meteo API for **Ahmedabad** (default location) and supported cities.
2. **Signal Derivation**: Calculating normalized 0–100 indicators:
   - `renewable_score`: Composite solar + wind availability score.
   - `price_signal`: Dynamic energy pricing index (inverse to renewable availability).
   - `carbon_intensity`: Estimated $\text{gCO}_2/\text{kWh}$ emissions.
3. **Offline Fallback Resilience**: Providing instant fallback dataset (`fallback_data.json`) when live weather API endpoints are unreachable or time out.
4. **Grid Event Simulation**: Exposing simulation hook (`trigger_renewable_drop`) to script the live pitch deck demo event (86% → 54% solar availability drop at 1:30 PM).

---

## 📋 API Contract Compliance (`docs/00-API-Contract.md` §5)

### Functions Exposed

```python
def get_renewable_signal(city: str = "Ahmedabad", hours_ahead: int = 24) -> list[dict]:
    """Pulls live Open-Meteo weather data and returns 24-hour renewable signal objects."""

def trigger_renewable_drop(new_score: float = 54.0, target_hour_offset: int = 2) -> list[dict]:
    """Simulates a sudden drop in renewable power score for demo re-optimization testing."""
```

### Signal Data Structure

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

## 🧪 Module Testing & Verification

To test signal retrieval, offline fallback, and renewable drop simulation directly:

```bash
python -m unittest backend/app/forecasting/test_forecasting.py
```
