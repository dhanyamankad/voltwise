import { useEffect, useState, useRef } from 'react';
import { PlanChangedEvent } from '../types';
import { WS_BASE_URL } from '../api/client';

export function useLiveUpdates(onPlanChanged?: (event: PlanChangedEvent) => void) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<PlanChangedEvent | null>(null);
  const attemptsRef = useRef<number>(0);
  const maxAttempts = 5;

  // Keep the latest callback in a ref so the connection effect below never has to depend on
  // it. Callers routinely pass a fresh inline function on every render (e.g. an arrow function
  // defined in JSX); depending on that identity would tear down and reopen the socket on every
  // re-render instead of keeping one persistent connection for the component's lifetime.
  const onPlanChangedRef = useRef(onPlanChanged);
  useEffect(() => {
    onPlanChangedRef.current = onPlanChanged;
  }, [onPlanChanged]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    function connect() {
      if (attemptsRef.current >= maxAttempts) {
        console.warn(`[VoltWise WS] Max reconnect attempts (${maxAttempts}) reached.`);
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
              onPlanChangedRef.current?.(planEvent);
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
    // Intentionally empty: connect once per mount. `onPlanChangedRef` (kept fresh above)
    // means this never needs to reconnect just because the caller re-rendered.
  }, []);

  return { isConnected, lastEvent };
}
