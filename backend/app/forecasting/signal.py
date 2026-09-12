"""
VoltWise — Weather & Renewable Signal Forecasting Module
Owner: Vanshi Davda (Track 04)

Pulls hourly solar irradiance, wind speed, and temperature from Open-Meteo API
and derives renewable availability scores, carbon intensity, and price signals.
Includes automatic fallback to local canned data on network failures.
"""

import json
import os
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple

# Supported Demo Cities (Latitude, Longitude)
CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
    "ahmedabad": (23.0225, 72.5714),
    "san francisco": (37.7749, -122.4194),
    "berlin": (52.5200, 13.4050),
    "london": (51.5074, -0.1278),
    "mumbai": (19.0760, 72.8777),
}

DEFAULT_CITY = "ahmedabad"
FALLBACK_FILE_PATH = os.path.join(os.path.dirname(__file__), "fallback_data.json")


def _calculate_derived_metrics(
    solar_w_m2: float, wind_m_s: float, temp_c: float
) -> Tuple[float, float, float]:
    """
    Converts raw weather parameters into derived signals (0-100 scale):
    - renewable_score: weighted solar (60%) + wind (40%) availability
    - price_signal: inverse relation to renewable availability with temperature stress penalty
    - carbon_intensity: inverse relation to renewable score
    """
    solar_norm = min(max(solar_w_m2 / 1000.0 * 100.0, 0.0), 100.0)
    wind_norm = min(max(wind_m_s / 20.0 * 100.0, 0.0), 100.0)

    # Solar dominates during peak daytime; wind provides baseline/nighttime renewable power
    renewable_score = round(min(max(0.6 * solar_norm + 0.4 * wind_norm, 0.0), 100.0), 1)

    # Price drops when renewables are abundant; high ambient temps increase grid cooling load
    price_signal = round(
        min(max(100.0 - 0.8 * renewable_score + max(0.0, temp_c - 28.0) * 0.5, 10.0), 100.0), 1
    )

    # Carbon intensity drops proportionally with renewable generation
    carbon_intensity = round(min(max(100.0 - renewable_score * 0.9, 5.0), 100.0), 1)

    return renewable_score, price_signal, carbon_intensity


def load_fallback_signal(hours_ahead: int = 24) -> List[Dict[str, Any]]:
    """Loads canned fallback data and adjusts timestamps relative to current UTC hour."""
    if os.path.exists(FALLBACK_FILE_PATH):
        try:
            with open(FALLBACK_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            # Align timestamps to start from current hour UTC
            now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
            result = []
            for i in range(min(hours_ahead, len(data))):
                item = dict(data[i])
                timestamp_dt = now + timedelta(hours=i)
                item["timestamp"] = timestamp_dt.strftime("%Y-%m-%dT%H:00:00Z")
                result.append(item)
            return result
        except Exception as e:
            print(f"[Forecasting] Warning: Failed to load fallback JSON ({e})")

    # Hardcoded emergency baseline if file is missing
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    emergency_signal = []
    for i in range(hours_ahead):
        timestamp_dt = now + timedelta(hours=i)
        hour = timestamp_dt.hour
        is_day = 6 <= hour <= 18
        solar = 700.0 if is_day else 0.0
        wind = 5.5
        temp = 32.0 if is_day else 27.0
        r_score, p_sig, c_int = _calculate_derived_metrics(solar, wind, temp)
        emergency_signal.append(
            {
                "timestamp": timestamp_dt.strftime("%Y-%m-%dT%H:00:00Z"),
                "solar_irradiance": solar,
                "wind_speed": wind,
                "temperature": temp,
                "renewable_score": r_score,
                "price_signal": p_sig,
                "carbon_intensity": c_int,
            }
        )
    return emergency_signal


def fetch_open_meteo_weather(city: str, hours_ahead: int = 24) -> List[Dict[str, Any]]:
    """Pulls live hourly weather data from Open-Meteo API for specified city."""
    city_key = city.lower().strip()
    lat, lon = CITY_COORDINATES.get(city_key, CITY_COORDINATES[DEFAULT_CITY])

    url = (
        "https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        "hourly=temperature_2m,wind_speed_10m,shortwave_radiation&"
        "forecast_days=2"
    )

    req = urllib.request.Request(url, headers={"User-Agent": "VoltWise-Forecasting/1.0"})
    with urllib.request.urlopen(req, timeout=3.0) as response:
        if response.status != 200:
            raise RuntimeError(f"Open-Meteo returned status {response.status}")
        raw_body = response.read().decode("utf-8")
        data = json.loads(raw_body)

    hourly = data.get("hourly", {})
    timestamps = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    winds = hourly.get("wind_speed_10m", [])
    solars = hourly.get("shortwave_radiation", [])

    signals: List[Dict[str, Any]] = []

    # Find starting index (closest to current UTC hour or first available)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
    start_idx = 0
    for idx, t_str in enumerate(timestamps):
        if t_str >= now_str:
            start_idx = idx
            break

    end_idx = min(start_idx + hours_ahead, len(timestamps))
    for i in range(start_idx, end_idx):
        t_str = timestamps[i]
        # Ensure ISO 8601 formatting with Z
        formatted_ts = t_str if t_str.endswith("Z") else f"{t_str}:00Z"
        solar = float(solars[i]) if i < len(solars) and solars[i] is not None else 0.0
        wind = float(winds[i]) if i < len(winds) and winds[i] is not None else 0.0
        temp = float(temps[i]) if i < len(temps) and temps[i] is not None else 25.0

        r_score, p_sig, c_int = _calculate_derived_metrics(solar, wind, temp)

        signals.append(
            {
                "timestamp": formatted_ts,
                "solar_irradiance": round(solar, 1),
                "wind_speed": round(wind, 1),
                "temperature": round(temp, 1),
                "renewable_score": r_score,
                "price_signal": p_sig,
                "carbon_intensity": c_int,
            }
        )

    if len(signals) < hours_ahead:
        # Fill missing hours if API returned fewer hours
        last_ts = datetime.fromisoformat(signals[-1]["timestamp"].replace("Z", "+00:00"))
        while len(signals) < hours_ahead:
            last_ts += timedelta(hours=1)
            signals.append(
                {
                    "timestamp": last_ts.strftime("%Y-%m-%dT%H:00:00Z"),
                    "solar_irradiance": 0.0,
                    "wind_speed": 4.0,
                    "temperature": 27.0,
                    "renewable_score": 15.0,
                    "price_signal": 88.0,
                    "carbon_intensity": 85.0,
                }
            )

    return signals[:hours_ahead]


def get_renewable_signal(city: str = DEFAULT_CITY, hours_ahead: int = 24) -> List[Dict[str, Any]]:
    """
    Main entry point matching 00-API-Contract.md §5 signature.
    Attempts live fetch from Open-Meteo, falling back gracefully to canned data.
    """
    try:
        return fetch_open_meteo_weather(city=city, hours_ahead=hours_ahead)
    except Exception as err:
        print(f"[Forecasting] Open-Meteo fetch failed ({err}). Using fallback data.")
        return load_fallback_signal(hours_ahead=hours_ahead)
