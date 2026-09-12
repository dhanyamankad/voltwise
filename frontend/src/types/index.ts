// VoltWise Shared TypeScript API Contract (matching docs/00-API-Contract.md §1 exactly)

export type VehicleClass = 'normal' | 'priority';
export type Preference = 'balanced' | 'cheapest' | 'greenest';
export type SessionStatus = 'scheduled' | 'charging' | 'completed' | 'moved' | 'cancelled';
export type PortStatus = 'idle' | 'occupied';
export type PortId = 'port_1' | 'port_2';

export interface EVRequest {
  id?: string;
  vehicle_class: VehicleClass;
  current_soc: number;        // 0-100 (%)
  target_soc: number;         // 0-100 (%)
  deadline: string;           // ISO 8601 datetime or HH:mm time
  charging_rate_kw: number;   // vehicle max charge rate (kW)
  preference: Preference;
  created_at?: string;
}

export interface Session {
  id: string;
  ev_id: string;
  port_id: PortId;
  start_time: string;         // ISO 8601 or HH:mm
  end_time: string;           // ISO 8601 or HH:mm
  status: SessionStatus;
  price_estimate: number;     // currency units
  green_score: number;        // 0-100
  co2_estimate_kg: number;
  reason: string;             // human-readable explanation
  version: number;            // increment on rescheduling
}

export interface Port {
  id: PortId;
  status: PortStatus;
  power_limit_kw: number;
  current_session_id: string | null;
}

export interface RenewableSignal {
  timestamp: string;          // ISO 8601
  solar_irradiance: number;   // W/m²
  wind_speed: number;         // m/s
  temperature: number;        // °C
  renewable_score: number;    // 0-100
  price_signal: number;       // relative price index
  carbon_intensity: number;   // relative carbon index
}

export interface PlanChangedEvent {
  type: 'plan_changed';
  session_id: string;
  old_window: { start: string; end: string };
  new_window: { start: string; end: string };
  reason: string;
  timestamp: string;
}

export interface StationState {
  ports: Port[];
  active_sessions: Session[];
  pending_requests: EVRequest[];
  current_signal: RenewableSignal;
}
