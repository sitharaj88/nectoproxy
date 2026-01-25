import { useEffect, useState } from 'react';
import { subscribeToTraffic, subscribeToProxy, getSocket } from '@/services/socket';
import { useTrafficStore } from '@/stores/trafficStore';
import type { TrafficEntry } from '@proxyscope/shared';

export function useSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [proxyConfig, setProxyConfig] = useState<{ port: number; uiPort: number } | null>(null);

  const addEntry = useTrafficStore((state) => state.addEntry);
  const addBatch = useTrafficStore((state) => state.addBatch);
  const updateEntry = useTrafficStore((state) => state.updateEntry);
  const clearEntries = useTrafficStore((state) => state.clearEntries);

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
