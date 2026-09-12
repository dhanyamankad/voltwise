// VoltWise API Client (Dual Mode: Mock Data vs Real FastAPI Backend)
// Toggle USE_MOCK to false when connecting to the live FastAPI backend on http://localhost:8000

import { EVRequest, Session, StationState, RenewableSignal } from '../types';
import mockScheduleData from '../../mock/schedule.json';
import mockSignalData from '../../mock/signal.json';
import mockSignalDroppedData from '../../mock/signal-dropped.json';

export const USE_MOCK = true;
export const API_BASE_URL = 'http://localhost:8000/api';
export const WS_BASE_URL = 'ws://localhost:8000/ws/updates';

// Mutable in-memory mock state initialized from schedule.json
let currentMockSchedule: StationState = JSON.parse(JSON.stringify(mockScheduleData));
let currentSignalVariant: RenewableSignal[] = JSON.parse(JSON.stringify(mockSignalData));
let isSignalDropped = false;

export async function submitEVRequest(request: EVRequest): Promise<Session> {
  if (request.current_soc > request.target_soc) {
    throw new Error('Invalid SOC Range: Current SOC cannot be greater than Target SOC.');
  }

  if (USE_MOCK) {
    await new Promise((res) => setTimeout(res, 400));

    const isPriority = request.vehicle_class === 'priority';
    const isGreenest = request.preference === 'greenest';
    const isCheapest = request.preference === 'cheapest';

    const newSession: Session = {
      id: `session_${Date.now().toString().slice(-4)}`,
      ev_id: request.id || `ev_${Math.floor(Math.random() * 900 + 100)}`,
      port_id: isPriority ? 'port_2' : 'port_1',
      start_time: isPriority ? '2:30 PM' : (isGreenest ? '2:15 PM' : (isCheapest ? '2:00 AM' : '3:00 PM')),
      end_time: isPriority ? '3:15 PM' : '4:30 PM',
      status: 'scheduled',
      price_estimate: isCheapest ? 4.20 : (isGreenest ? 6.40 : 5.80),
      green_score: isGreenest ? 92 : (isPriority ? 54 : 88),
      co2_estimate_kg: isGreenest ? 3.8 : 4.2,
      reason: isPriority
        ? 'Protected priority dispatch allocation for emergency response vehicle.'
        : `Scheduled at 2:15 PM during peak solar generation (86% renewable energy).`,
      version: 1
    };

    currentMockSchedule.active_sessions.unshift(newSession);
    return newSession;
  }

  const response = await fetch(`${API_BASE_URL}/ev-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}

export async function fetchSchedule(): Promise<StationState> {
  if (USE_MOCK) {
    await new Promise((res) => setTimeout(res, 200));
    return currentMockSchedule;
  }

  const response = await fetch(`${API_BASE_URL}/schedule`);
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}

export async function fetchRenewableSignal(city: string = 'demo'): Promise<RenewableSignal[]> {
  if (USE_MOCK) {
    return currentSignalVariant;
  }

  const response = await fetch(`${API_BASE_URL}/renewable-signal?city=${encodeURIComponent(city)}`);
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}

export async function triggerRenewableDrop(newScore: number = 54): Promise<{ ok: boolean }> {
  if (USE_MOCK) {
    await new Promise((res) => setTimeout(res, 400));
    
    // Swap in signal-dropped.json dataset
    isSignalDropped = true;
    currentSignalVariant = JSON.parse(JSON.stringify(mockSignalDroppedData));
    currentMockSchedule.current_signal.renewable_score = newScore;
    currentMockSchedule.current_signal.solar_irradiance = 420;

    // Re-optimize flexible session on Port 1
    const port1Session = currentMockSchedule.active_sessions.find((s) => s.port_id === 'port_1');
    if (port1Session) {
      port1Session.start_time = '3:15 PM';
      port1Session.end_time = '5:30 PM';
      port1Session.green_score = 64;
      port1Session.reason = `AUTO-RESCHEDULED: Solar generation dropped from 86% to 54%. Shifted to 3:15 PM clean window.`;
      port1Session.version += 1;
    }

    return { ok: true };
  }

  const response = await fetch(`${API_BASE_URL}/simulate/renewable-drop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_score: newScore })
  });
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}
