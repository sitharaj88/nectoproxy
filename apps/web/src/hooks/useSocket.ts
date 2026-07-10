import { useEffect, useState } from 'react';
import { subscribeToTraffic, subscribeToProxy, getSocket } from '@/services/socket';
import { getTraffic, getActiveSession } from '@/services/api';
import { useTrafficStore } from '@/stores/trafficStore';
import type { TrafficEntry } from '@nectoproxy/shared';

export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [proxyConfig, setProxyConfig] = useState<{ port: number; uiPort: number } | null>(null);

  const addEntry = useTrafficStore((state) => state.addEntry);
  const addBatch = useTrafficStore((state) => state.addBatch);
  const seedEntries = useTrafficStore((state) => state.seedEntries);
  const updateEntry = useTrafficStore((state) => state.updateEntry);
  const clearEntries = useTrafficStore((state) => state.clearEntries);

  // Backfill recently-captured traffic on load so a reload doesn't show an
  // empty list while entries already sit in the database. The live socket then
  // streams new traffic on top (seedEntries dedups by id).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getActiveSession();
        if (cancelled || !session) return;
        const res = await getTraffic({ sessionId: session.id, limit: 1000 });
        if (!cancelled) seedEntries(res.entries as TrafficEntry[]);
      } catch {
        // Non-fatal: the live socket still populates going forward.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seedEntries]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial connection state
    setIsConnected(socket.connected);

    // Subscribe to traffic events
    const unsubscribeTraffic = subscribeToTraffic(
      (entry: TrafficEntry) => addEntry(entry),
      (update) => updateEntry(update.id, update),
      (entries: TrafficEntry[]) => addBatch(entries),
      () => clearEntries()
    );

    // Subscribe to proxy events
    const unsubscribeProxy = subscribeToProxy(
      (config) => setProxyConfig(config),
      () => setProxyConfig(null),
      (error) => console.error('Proxy error:', error)
    );

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubscribeTraffic();
      unsubscribeProxy();
    };
  }, [addEntry, addBatch, updateEntry, clearEntries]);

  return { isConnected, proxyConfig };
}
