import { useEffect, useState, useCallback } from 'react';
import { PlanChangedEvent } from '../types';
import { USE_MOCK, WS_BASE_URL } from '../api/client';

export function useLiveUpdates(onPlanChanged?: (event: PlanChangedEvent) => void) {
  const [isConnected, setIsConnected] = useState<boolean>(USE_MOCK);
  const [lastEvent, setLastEvent] = useState<PlanChangedEvent | null>(null);

  const emitMockPlanChange = useCallback((
    sessionId: string = 'session_101',
    reason: string = 'AUTO-RESCHEDULED: Sudden 30% solar drop detected. Session moved to 15:15 peak clean window.'
  ) => {
    const mockEvent: PlanChangedEvent = {
      type: 'plan_changed',
      session_id: sessionId,
      old_window: { start: '14:15', end: '16:30' },
      new_window: { start: '15:15', end: '17:30' },
      reason,
      timestamp: new Date().toISOString()
    };
    setLastEvent(mockEvent);
    if (onPlanChanged) onPlanChanged(mockEvent);
  }, [onPlanChanged]);

  useEffect(() => {
    if (USE_MOCK) {
      setIsConnected(true);
      return;
    }

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(WS_BASE_URL);

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data: PlanChangedEvent = JSON.parse(event.data);
          setLastEvent(data);

          if (data.type === 'plan_changed' && onPlanChanged) {
            onPlanChanged(data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
      };

      socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
        setIsConnected(false);
      };
    } catch (e) {
      console.error('Failed to establish WebSocket connection:', e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [onPlanChanged]);

  return { isConnected, lastEvent, emitMockPlanChange };
}
