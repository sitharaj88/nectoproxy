import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Gauge, Clock, AlertTriangle, X, Check } from 'lucide-react';
import {
  getNetworkProfiles,
  activateNetworkProfile,
  deactivateNetworkProfile,
  type NetworkProfile,
} from '../services/api';

interface NetworkConditionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileChange?: (profile: NetworkProfile | null) => void;
}

export function NetworkConditionPanel({
  isOpen,
  onClose,
  onProfileChange,
}: NetworkConditionPanelProps) {
  const [profiles, setProfiles] = useState<NetworkProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<NetworkProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNetworkProfiles();
      setProfiles(data.profiles);
      setActiveProfile(data.activeProfile);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen, loadProfiles]);

  const handleActivate = useCallback(
    async (profileId: string) => {
      try {
        const data = await activateNetworkProfile(profileId);
        setActiveProfile(data.activeProfile);
        onProfileChange?.(data.activeProfile);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [onProfileChange]
  );

  const handleDeactivate = useCallback(async () => {
    try {
      await deactivateNetworkProfile();
      setActiveProfile(null);
      onProfileChange?.(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [onProfileChange]);

  function formatBandwidth(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return 'Unlimited';
    if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`;
    if (bytesPerSecond < 1024 * 1024) {
      return `${((bytesPerSecond * 8) / 1024).toFixed(0)} Kbps`;
    }
    return `${((bytesPerSecond * 8) / (1024 * 1024)).toFixed(1)} Mbps`;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary-400" />
            Network Conditioning
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Profile Banner */}
        {activeProfile && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-primary-400" />
              <div>
                <div className="font-medium text-primary-300">
                  {activeProfile.name} Active
                </div>
                <div className="text-sm text-gray-400">
                  {activeProfile.description}
                </div>
              </div>
            </div>
            <button
              onClick={handleDeactivate}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
            >
              Disable
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
            </div>
          ) : error ? (
            <div className="p-4 text-red-400 text-center">{error}</div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-400 mb-3">
                Network Profiles
              </h4>
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    activeProfile?.id === profile.id
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => handleActivate(profile.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{profile.name}</span>
                        {activeProfile?.id === profile.id && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary-500/20 text-primary-300">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {profile.description}
                      </p>
                    </div>
                    {activeProfile?.id === profile.id && (
                      <Check className="w-5 h-5 text-primary-400" />
                    )}
                  </div>

                  {/* Profile stats */}
                  {profile.downloadBandwidth > 0 ||
                  profile.latency > 0 ||
                  profile.packetLoss > 0 ? (
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {formatBandwidth(profile.downloadBandwidth)}↓{' '}
                        {formatBandwidth(profile.uploadBandwidth)}↑
                      </div>
                      {profile.latency > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {profile.latency}ms
                          {profile.latencyJitter > 0 &&
                            ` ±${profile.latencyJitter}ms`}
                        </div>
                      )}
                      {profile.packetLoss > 0 && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <AlertTriangle className="w-3 h-3" />
                          {profile.packetLoss}% loss
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            Network conditioning simulates slow network conditions
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
