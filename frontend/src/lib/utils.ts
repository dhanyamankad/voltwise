import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RenewableSignal } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Robust ISO 8601 time string formatter to 12-hour AM/PM format
 */
export function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T') || timeStr.includes('Z')) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }
  return timeStr;
}

/**
 * Data-driven solar, wind, and grid percentage breakdown based on raw weather parameters
 */
export function calculateRenewableBreakdown(
  renewableScore: number,
  signal?: RenewableSignal
): { solarScore: number; windScore: number; gridScore: number } {
  const solarIrradiance = signal?.solar_irradiance ?? 600;
  const windSpeed = signal?.wind_speed ?? 6.0;

  // Normalized capacity scales: solar (1000 W/m² = 100%), wind (20 m/s = 100%)
  const solarNorm = Math.min(100, Math.max(0, (solarIrradiance / 1000) * 100));
  const windNorm = Math.min(100, Math.max(0, (windSpeed / 20) * 100));
  const totalNorm = solarNorm + windNorm;

  if (totalNorm <= 0) {
    const solar = Math.round(renewableScore * 0.5);
    const wind = renewableScore - solar;
    return { solarScore: solar, windScore: wind, gridScore: Math.max(0, 100 - renewableScore) };
  }

  const solarShare = solarNorm / totalNorm;
  const solarScore = Math.round(renewableScore * solarShare);
  const windScore = Math.max(0, Math.round(renewableScore - solarScore));
  const gridScore = Math.max(0, Math.round(100 - renewableScore));

  return { solarScore, windScore, gridScore };
}
