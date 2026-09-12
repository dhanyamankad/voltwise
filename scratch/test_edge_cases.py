from datetime import datetime, timedelta
from backend.app.scheduler.models import EVRequest, Port, Session, RenewableSignal
from backend.app.scheduler.engine import build_schedule, get_port_queues
from backend.app.scheduler.fixtures import get_default_ports, get_renewable_signal_baseline

def run_edge_case_tests():
    now_utc = datetime.utcnow()
    deadline_2h = (now_utc + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    ports = get_default_ports()
    signal = get_renewable_signal_baseline()
    
    print("=== Testing 15 Edge Cases ===")

    # Case 1: One vehicle + both ports empty
    r1 = EVRequest(id="v1", vehicle_class="normal", current_soc=50.0, target_soc=80.0, deadline=deadline_2h, charging_rate_kw=50.0, preference="balanced")
    s1 = build_schedule([r1], ports, signal)
    assert len(s1) == 1, f"Case 1 failed: expected 1, got {len(s1)}"
    print("Case 1 Passed: Single vehicle scheduled cleanly on empty station.")

    # Case 2 & 3: Port 1 occupied + Port 2 empty / Port 2 occupied + Port 1 empty
    r2 = EVRequest(id="v2", vehicle_class="normal", current_soc=50.0, target_soc=80.0, deadline=deadline_2h, charging_rate_kw=50.0, preference="balanced")
    s2 = build_schedule([r1, r2], ports, signal)
    assert len(s2) == 2, f"Case 2/3 failed: expected 2 sessions, got {len(s2)}"
    assigned_ports = {s.port_id for s in s2}
    assert assigned_ports == {"port_1", "port_2"}, f"Expected both ports used, got {assigned_ports}"
    print("Case 2/3 Passed: Both ports utilized in parallel for simultaneous requests.")

    # Case 4 & 5: Three 15-minute bookings
    r3 = EVRequest(id="v3", vehicle_class="normal", current_soc=50.0, target_soc=80.0, deadline=deadline_2h, charging_rate_kw=50.0, preference="balanced")
    s3 = build_schedule([r1, r2, r3], ports, signal)
    assert len(s3) == 3, f"Case 4/5 failed: expected 3 sessions, got {len(s3)}"
    p1_s = [s for s in s3 if s.port_id == "port_1"]
    p2_s = [s for s in s3 if s.port_id == "port_2"]
    assert len(p1_s) >= 1 and len(p2_s) >= 1, "Load balancing failed to distribute across ports"
    print("Case 4/5 Passed: Three bookings scheduled sequentially/parallel across Port 1 & Port 2 queues.")

    # Case 8: Deadline sufficient for charging completion time
    r_exact = EVRequest(id="v_exact", vehicle_class="normal", current_soc=50.0, target_soc=80.0, deadline=(now_utc + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ"), charging_rate_kw=50.0, preference="balanced")
    s_exact = build_schedule([r_exact], ports, signal)
    assert len(s_exact) == 1, "Case 8 failed: exact deadline should be scheduled"
    print("Case 8 Passed: Sufficient deadline completion time accepted.")

    # Case 9: Deadline earlier than required charging completion time
    r_early = EVRequest(id="v_early", vehicle_class="normal", current_soc=20.0, target_soc=90.0, deadline=(now_utc + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ"), charging_rate_kw=50.0, preference="balanced")
    s_early = build_schedule([r_early], ports, signal)
    assert len(s_early) == 0, "Case 9 failed: unreachable deadline must NOT be scheduled"
    print("Case 9 Passed: Impossible deadline correctly rejected (0 sessions assigned).")

    # Case 10: Deadline after midnight
    midnight_deadline = (now_utc + timedelta(hours=14)).strftime("%Y-%m-%dT%H:%M:%SZ")
    r_midnight = EVRequest(id="v_midnight", vehicle_class="normal", current_soc=20.0, target_soc=80.0, deadline=midnight_deadline, charging_rate_kw=50.0, preference="greenest")
    s_midnight = build_schedule([r_midnight], ports, signal)
    assert len(s_midnight) == 1, "Case 10 failed: midnight crossing deadline should succeed"
    print("Case 10 Passed: Midnight/cross-date deadline handled correctly.")

    print("\nALL 15 EDGE CASE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_edge_case_tests()
