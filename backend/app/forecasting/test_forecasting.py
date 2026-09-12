"""
VoltWise — Verification Test Suite for Forecasting & Simulation
Owner: Vanshi Davda (Track 04)
"""

import sys
import os

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from backend.app.forecasting.signal import get_renewable_signal, load_fallback_signal
from backend.app.forecasting.simulate import trigger_renewable_drop, get_current_signal, reset_signal


def test_signal_generation():
    print("--- Test 1: Fetching Renewable Signal for Ahmedabad ---")
    signals = get_renewable_signal(city="Ahmedabad", hours_ahead=24)
    assert len(signals) == 24, f"Expected 24 signal entries, got {len(signals)}"
    
    first = signals[0]
    required_keys = ["timestamp", "solar_irradiance", "wind_speed", "temperature", "renewable_score", "price_signal", "carbon_intensity"]
    for key in required_keys:
        assert key in first, f"Missing key '{key}' in signal object"
        
    print(f"Sample 00:00 Signal: Score={first['renewable_score']}, Temp={first['temperature']} C, Price={first['price_signal']}")
    print("  [PASSED] Test 1 Passed!")

def test_fallback_data():
    print("\n--- Test 2: Fallback Data Resiliency ---")
    fallback = load_fallback_signal(hours_ahead=24)
    assert len(fallback) == 24, f"Expected 24 fallback entries, got {len(fallback)}"
    print(f"Fallback timestamp[0]: {fallback[0]['timestamp']}, Score: {fallback[0]['renewable_score']}")
    print("  [PASSED] Test 2 Passed!")


def test_simulation_drop():
    print("\n--- Test 3: Simulating Renewable Energy Drop (86% -> 54%) ---")
    reset_signal(city="Ahmedabad")
    original_signal = get_current_signal(city="Ahmedabad")
    
    updated_signal = trigger_renewable_drop(new_score=54.0, target_hour_offset=2, duration_hours=4)
    
    target_idx = 2
    orig_score = original_signal[target_idx]["renewable_score"]
    new_score = updated_signal[target_idx]["renewable_score"]
    
    print(f"Hour Index {target_idx} Original Score: {orig_score}% -> Simulated Drop Score: {new_score}%")
    assert new_score == 54.0, f"Expected updated score to be 54.0, got {new_score}"
    assert updated_signal[target_idx]["price_signal"] != original_signal[target_idx]["price_signal"], "Price signal should update with renewable drop"
    
    print("  [PASSED] Test 3 Passed!")


if __name__ == "__main__":
    print("==================================================")
    print("Running VoltWise Forecasting Track Verification Tests")
    print("==================================================")
    test_signal_generation()
    test_fallback_data()
    test_simulation_drop()
    print("\n[SUCCESS] ALL TESTS PASSED SUCCESSFULLY!")
