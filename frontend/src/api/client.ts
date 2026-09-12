/// <reference types="vite/client" />
// VoltWise Production API Client
// Direct integration with FastAPI backend (REST & WebSockets)

import { EVRequest, Session, StationState, RenewableSignal } from '../types';

export const USE_MOCK = false;

const env = (import.meta as any).env || {};
export const API_BASE_URL: string = env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const WS_BASE_URL: string = env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws/updates';

/**
 * Submit a new EV charging request to the backend scheduler
 */
export async function submitEVRequest(request: EVRequest): Promise<Session> {
  if (request.current_soc > request.target_soc) {
    throw new Error('Invalid SOC Range: Current SOC cannot be greater than Target SOC.');
  }

  const response = await fetch(`${API_BASE_URL}/ev-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch current Station State (Ports, Queue, Active Sessions, Grid Signal)
 */
export async function fetchSchedule(): Promise<StationState> {
  const response = await fetch(`${API_BASE_URL}/schedule`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch 24-Hour Renewable Signal Forecast
 */
export async function fetchRenewableSignal(city: string = 'Ahmedabad'): Promise<RenewableSignal[]> {
  const response = await fetch(`${API_BASE_URL}/renewable-signal?city=${encodeURIComponent(city)}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Trigger a simulated renewable solar drop event (30% drop simulation)
 */
export async function triggerRenewableDrop(newScore: number = 54): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE_URL}/simulate/renewable-drop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_score: newScore })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}
