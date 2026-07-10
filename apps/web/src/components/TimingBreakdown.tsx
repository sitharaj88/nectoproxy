import { useMemo } from 'react';

interface TimingData {
  blocked?: number;
  dns?: number;
  connect?: number;
  ssl?: number;
  send?: number;
  wait?: number;
  receive?: number;
}

interface TimingBreakdownProps {
  duration: number;
  timing?: TimingData;
}

const TIMING_PHASES = [
  { key: 'blocked', label: 'Blocked', color: '#9ca3af', description: 'Time spent in queue' },
  { key: 'dns', label: 'DNS', color: '#06b6d4', description: 'DNS lookup time' },
  { key: 'connect', label: 'Connect', color: '#22c55e', description: 'TCP connection time' },
  { key: 'ssl', label: 'SSL', color: '#a855f7', description: 'TLS handshake time' },
  { key: 'send', label: 'Send', color: '#3b82f6', description: 'Time to send request' },
  { key: 'wait', label: 'Wait', color: '#eab308', description: 'Time to first byte (TTFB)' },
  { key: 'receive', label: 'Receive', color: '#10b981', description: 'Time to download response' },
];

export function TimingBreakdown({ duration, timing }: TimingBreakdownProps) {
  // If no detailed timing, show simple duration bar
  const hasDetailedTiming = timing && Object.keys(timing).length > 0;

  const phases = useMemo(() => {
    if (!hasDetailedTiming) {
      // Estimate phases from total duration
      return [
        { key: 'wait', label: 'Wait', color: '#eab308', value: duration * 0.6 },
        { key: 'receive', label: 'Receive', color: '#10b981', value: duration * 0.4 },
      ];
    }

    return TIMING_PHASES
      .filter((phase) => timing[phase.key as keyof TimingData] && timing[phase.key as keyof TimingData]! > 0)
      .map((phase) => ({
        ...phase,
        value: timing[phase.key as keyof TimingData] || 0,
      }));
  }, [timing, duration, hasDetailedTiming]);

  const total = phases.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="space-y-4">
      {/* Timeline Bar */}
      <div className="relative">
        <div className="h-8 flex rounded-md overflow-hidden bg-surface">
          {phases.map((phase) => {
            const width = (phase.value / total) * 100;
            if (width < 0.5) return null;

            return (
              <div
                key={phase.key}
                className="relative group flex items-center justify-center transition-all hover:opacity-80"
                style={{
                  width: `${width}%`,
                  backgroundColor: phase.color,
                  minWidth: width > 5 ? undefined : '4px',
                }}
              >
                {width > 10 && (
                  <span className="text-xs font-medium text-white/90 truncate px-1">
                    {phase.value.toFixed(0)}ms
                  </span>
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-overlay text-ink text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-edge shadow-popover">
                  {phase.label}: {phase.value.toFixed(1)}ms
                </div>
              </div>
            );
          })}
        </div>

        {/* Total duration label */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full pl-3">
          <span className="text-sm font-medium text-ink-secondary tabular-nums">{duration.toFixed(0)}ms</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {phases.map((phase) => (
          <div key={phase.key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: phase.color }}
            />
            <div className="min-w-0">
              <div className="text-xs text-ink-muted truncate">{phase.label}</div>
              <div className="text-sm text-ink font-medium tabular-nums">
                {phase.value.toFixed(1)}ms
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Phase descriptions */}
      {hasDetailedTiming && (
        <div className="pt-3 border-t border-edge">
          <h4 className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-2">
            Phase Details
          </h4>
          <div className="space-y-1">
            {phases.map((phase) => {
              const phaseInfo = TIMING_PHASES.find((p) => p.key === phase.key);
              return (
                <div key={phase.key} className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">{phaseInfo?.description || phase.label}</span>
                  <span className="text-ink-secondary font-mono tabular-nums">{phase.value.toFixed(2)}ms</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
