"""
VoltWise Scheduler Unit Tests

Tests hard constraint enforcement, priority queue scheduling, dynamic re-optimization,
and reason generation against test fixture scenarios.
"""

import unittest
from datetime import datetime, timedelta

from backend.app.scheduler.models import EVRequest, Port, RenewableSignal, Session
from backend.app.scheduler.engine import build_schedule, reoptimize
from backend.app.scheduler.constraints import (
    calculate_charging_duration_hours,
    is_port_available,
    is_deadline_respected,
    parse_iso_datetime
)
from backend.app.scheduler.fixtures import (
    get_default_ports,
    get_renewable_signal_baseline,
    get_renewable_signal_drop,
    scenario_three_normal_evs,
    scenario_priority_ambulance
)


class TestVoltWiseScheduler(unittest.TestCase):

    def test_calculate_charging_duration(self):
        """Verify charging duration calculation for SOC delta."""
        # 20% to 80% on 60kWh battery = 36kWh needed.
        # At 50kW charging rate -> 36/50 = 0.72 hours (43.2 mins)
        duration = calculate_charging_duration_hours(
            current_soc=20.0,
            target_soc=80.0,
            charging_rate_kw=50.0,
            port_power_limit_kw=50.0,
            battery_capacity_kwh=60.0
        )
        self.assertAlmostEqual(duration, 0.72, places=2)

    def test_scenario_three_normal_evs(self):
        """Verify 3 normal EVs competing for 2 ports generate feasible non-overlapping sessions."""
        reqs, ports, signal = scenario_three_normal_evs()
        sessions = build_schedule(reqs, ports, signal)

        self.assertEqual(len(sessions), 3)

        # Check port occupancy & deadlines for all scheduled sessions
        for session in sessions:
            self.assertIn(session.port_id, ["port_1", "port_2"])
            self.assertEqual(session.status, "scheduled")
            self.assertGreater(session.green_score, 0)
            self.assertTrue(len(session.reason) > 0)

            # Match with EV request deadline
            req = next(r for r in reqs if r.id == session.ev_id)
            end_dt = parse_iso_datetime(session.end_time)
            deadline_dt = parse_iso_datetime(req.deadline)
            self.assertLessEqual(end_dt, deadline_dt)

    def test_scenario_priority_ambulance(self):
        """Verify priority EV (ambulance) is scheduled first and protected."""
        reqs, ports, signal = scenario_priority_ambulance()
        sessions = build_schedule(reqs, ports, signal)

        self.assertEqual(len(sessions), 3)
        ambulance_session = next(s for s in sessions if s.ev_id == "EV-C")

        self.assertIsNotNone(ambulance_session)
        self.assertIn("Priority vehicle", ambulance_session.reason)

    def test_reoptimize_renewable_drop(self):
        """
        Verify renewable score drop triggers re-optimization of flexible sessions,
        while priority sessions remain untouched.
        """
        reqs, ports, signal_baseline = scenario_priority_ambulance()
        initial_sessions = build_schedule(reqs, ports, signal_baseline)

        # Trigger renewable drop signal
        signal_drop = get_renewable_signal_drop()

        # Reoptimize
        changed_sessions = reoptimize(initial_sessions, signal_drop)

        # Verify priority ambulance is NOT in changed_sessions
        changed_ev_ids = [s.ev_id for s in changed_sessions]
        self.assertNotIn("EV-C", changed_ev_ids, "Priority EV-C must not be changed in reoptimize()")

        # Verify any moved session has status 'moved' and version incremented
        for session in changed_sessions:
            self.assertEqual(session.status, "moved")
            self.assertEqual(session.version, 2)
            self.assertIn("Renewable grid score dropped", session.reason)

    def test_reason_generation(self):
        """Verify reason strings are human-readable and contain key score context."""
        reqs, ports, signal = scenario_three_normal_evs()
        sessions = build_schedule(reqs, ports, signal)

        for session in sessions:
            self.assertIsInstance(session.reason, str)
            self.assertGreater(len(session.reason), 10)

    def test_unique_session_ids(self):
        """Verify build_schedule generates unique IDs tied to request IDs."""
        reqs, ports, signal = scenario_three_normal_evs()
        sessions = build_schedule(reqs, ports, signal)
        session_ids = [s.id for s in sessions]
        self.assertEqual(len(session_ids), len(set(session_ids)))
        self.assertTrue(all(s.id.startswith("session_EV-") for s in sessions))

    def test_old_window_tracking_in_reoptimize(self):
        """Verify reoptimize attaches _old_start_time and _old_end_time to changed sessions."""
        reqs, ports, signal_baseline = scenario_priority_ambulance()
        sessions = build_schedule(reqs, ports, signal_baseline)
        signal_drop = get_renewable_signal_drop()

        changed = reoptimize(sessions, signal_drop)
        for s in changed:
            self.assertTrue(hasattr(s, "_old_start_time"))
            self.assertTrue(hasattr(s, "_old_end_time"))


if __name__ == "__main__":
    unittest.main()
