import { useEffect, useState, useCallback } from 'react';
import { PlanChangedEvent } from '../types';
import { WS_BASE_URL } from '../api/client';

export function useLiveUpdates(onPlanChanged?: (event: PlanChangedEvent) => void) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<PlanChangedEvent | null>(null);

  const emitMockPlanChange = useCallback((
    sessionId: string = 'session_101',
    reason: string = 'AUTO-RESCHEDULED: Sudden 30% solar drop detected. Session moved to 3:15 PM peak clean window.'
  ) => {
    const mockEvent: PlanChangedEvent = {
      type: 'plan_changed',
      session_id: sessionId,
      old_window: { start: '2:15 PM', end: '4:30 PM' },
      new_window: { start: '3:15 PM', end: '5:30 PM' },
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
      try {
        socket = new WebSocket(WS_BASE_URL);

        socket.onopen = () => {
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
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
          // Try reconnecting after 3 seconds if disconnected
          reconnectTimer = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          setIsConnected(false);
        };
      } catch (e) {
        console.error('Failed to establish WebSocket connection:', e);
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null; // Prevent reconnect on explicit unmount
        socket.close();
      }
    };
  }, [onPlanChanged]);

  return { isConnected, lastEvent, emitMockPlanChange };
}
