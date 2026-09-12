import { useEffect, useState, useCallback, useRef } from 'react';
import { PlanChangedEvent } from '../types';
import { WS_BASE_URL } from '../api/client';

export function useLiveUpdates(onPlanChanged?: (event: PlanChangedEvent) => void) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<PlanChangedEvent | null>(null);
  const attemptsRef = useRef<number>(0);
  const maxAttempts = 5;

  const emitMockPlanChange = useCallback((
    sessionId: string = 'session_101',
    reason: string = 'AUTO-RESCHEDULED: Sudden 30% solar drop detected. Session moved to peak clean window.'
  ) => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 45 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const endTime = new Date(now.getTime() + 105 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const mockEvent: PlanChangedEvent = {
      type: 'plan_changed',
      session_id: sessionId,
      old_window: { start: '11:05 AM', end: '11:48 AM' },
      new_window: { start: startTime, end: endTime },
      reason,
      timestamp: new Date().toISOString()
    };
    setLastEvent(mockEvent);
    if (onPlanChanged) onPlanChanged(mockEvent);
  }, [onPlanChanged]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    function connect() {
      if (attemptsRef.current >= maxAttempts) {
        console.warn(`[VoltWise WS] Max reconnect attempts (${maxAttempts}) reached. Operating in offline/standby mode.`);
        return;
      }

      try {
        socket = new WebSocket(WS_BASE_URL);

        socket.onopen = () => {
          setIsConnected(true);
          attemptsRef.current = 0; // Reset counter on successful connection
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Dispatch global state refresh event for all active views
            window.dispatchEvent(new CustomEvent('voltwise:state_update'));
            
            if (data.type === 'plan_changed') {
              const planEvent: PlanChangedEvent = data;
              setLastEvent(planEvent);
              if (onPlanChanged) onPlanChanged(planEvent);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          attemptsRef.current += 1;
          
          if (attemptsRef.current < maxAttempts) {
            // Exponential backoff: 1s, 2s, 4s, 8s, 10s
            const delay = Math.min(1000 * Math.pow(2, attemptsRef.current - 1), 10000);
            reconnectTimer = setTimeout(connect, delay);
          }
        };

        socket.onerror = () => {
          setIsConnected(false);
        };
      } catch (e) {
        setIsConnected(false);
        attemptsRef.current += 1;
      }
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [onPlanChanged]);

  return { isConnected, lastEvent, emitMockPlanChange };
}
