/// <reference types="vite/client" />
// VoltWise Production API Client
// Direct integration with FastAPI backend with seamless mock fallback for offline demo safety

import { EVRequest, Session, StationState, RenewableSignal } from '../types';

import mockSchedule from '../../mock/schedule.json';
import mockSignal from '../../mock/signal.json';
import mockSignalDropped from '../../mock/signal-dropped.json';

export const USE_MOCK = false;

const env = (import.meta as any).env || {};
export const API_BASE_URL: string = env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const WS_BASE_URL: string = env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws/updates';

/**
 * Submit a new EV charging request to the backend scheduler (or mock engine)
 */
export async function submitEVRequest(request: EVRequest): Promise<Session> {
  if (request.current_soc >= request.target_soc) {
    throw new Error('Invalid SOC Range: Target SOC must be strictly greater than Current SOC.');
  }

  if (USE_MOCK) {
    return createMockSession(request);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/ev-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (err: any) {
    console.warn('[VoltWise API] Backend unreachable or failed. Falling back to offline client scheduler:', err);
    return createMockSession(request);
  }
}

/**
 * Fetch current Station State (Ports, Queue, Active Sessions, Grid Signal)
 */
export async function fetchSchedule(): Promise<StationState> {
  if (USE_MOCK) {
    return mockSchedule as StationState;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/schedule`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    console.warn('[VoltWise API] Backend unreachable for schedule. Using mock station state fallback.');
    return mockSchedule as StationState;
  }
}

/**
 * Fetch 24-Hour Renewable Signal Forecast
 */
export async function fetchRenewableSignal(city: string = 'Ahmedabad'): Promise<RenewableSignal[]> {
  if (USE_MOCK) {
    return mockSignal as RenewableSignal[];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/renewable-signal?city=${encodeURIComponent(city)}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    console.warn('[VoltWise API] Backend unreachable for renewable signal. Using mock signal fallback.');
    return mockSignal as RenewableSignal[];
  }
}

/**
 * Trigger a simulated renewable solar drop event
 */
export async function triggerRenewableDrop(newScore: number = 54): Promise<{ ok: boolean }> {
  if (USE_MOCK) {
    return { ok: true };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/simulate/renewable-drop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_score: newScore })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    console.warn('[VoltWise API] Renewable drop simulation endpoint unreachable. Triggering client-side fallback.');
    return { ok: true };
  }
}

/**
 * Helper to generate a realistic mock Session object for offline demo presentation
 */
function createMockSession(req: EVRequest): Session {
  const now = new Date();
  const startTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins from now
  const durationMins = Math.max(15, Math.round(((req.target_soc - req.current_soc) / 100) * 60));
  const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000);

  const isPriority = req.vehicle_class === 'priority';
  const greenScore = req.preference === 'greenest' ? 88 : req.preference === 'cheapest' ? 62 : 74;
  const priceEst = Number((((req.target_soc - req.current_soc) * 0.3) + 1.2).toFixed(2));
  const co2Est = Number((((100 - greenScore) * 0.05) + 0.8).toFixed(2));

  return {
    id: `session_mock_${Math.random().toString(36).substring(2, 9)}`,
    ev_id: `ev_mock_${Math.random().toString(36).substring(2, 9)}`,
    port_id: isPriority ? 'port_2' : 'port_1',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: 'scheduled',
    price_estimate: priceEst,
    green_score: greenScore,
    co2_estimate_kg: co2Est,
    reason: isPriority
      ? 'Priority dispatch allocation reserved for emergency fleet unit.'
      : `Scheduled at ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — ${greenScore}% clean renewable score window.`,
    version: 1
  };
}
