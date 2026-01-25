interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', variant = 'default', style }: SkeletonProps) {
  const variantClasses = {
    default: 'rounded',
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
  };

  return (
    <div
      className={`animate-pulse bg-gray-700 ${variantClasses[variant]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
}

export function TrafficListSkeleton({ rows = 15 }: { rows?: number }) {
  return (
    <div className="p-2 space-y-1" role="status" aria-label="Loading traffic list">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 p-2 rounded"
          style={{ opacity: 1 - i * 0.05 }}
        >
          <Skeleton className="w-10 h-5" />
          <Skeleton className="w-12 h-5" />
          <Skeleton className="flex-1 h-5" />
          <Skeleton className="w-16 h-5" />
          <Skeleton className="w-16 h-5" />
        </div>
      ))}
    </div>
  );
}

export function DetailPanelSkeleton() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading details">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="w-3/4 h-6" />
        <Skeleton className="w-1/2 h-4" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="w-20 h-8" />
        ))}
      </div>

      {/* Content lines */}
      <div className="space-y-2">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-4" />
      </div>

      {/* Code block */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-2">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-4/5 h-3" />
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-2/3 h-3" />
        <Skeleton className="w-full h-3" />
      </div>
    </div>
  );
}

export function WaterfallSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-2" role="status" aria-label="Loading waterfall chart">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
        <Skeleton className="w-48 h-4" />
        <div className="flex-1 flex justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-12 h-3" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2"
          style={{ opacity: 1 - i * 0.05 }}
        >
          <Skeleton className="w-48 h-5" />
          <div className="flex-1 h-5 bg-gray-800 rounded relative overflow-hidden">
            <Skeleton
              className="h-full absolute"
              style={{
                left: `${Math.random() * 30}%`,
                width: `${20 + Math.random() * 40}%`,
              }}
            />
          </div>
          <Skeleton className="w-12 h-5" />
        </div>
      ))}
    </div>
  );
}

export function RulesSkeleton() {
  return (
    <div className="p-4 space-y-3" role="status" aria-label="Loading rules">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 bg-gray-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="w-1/3 h-5" />
            <Skeleton className="w-16 h-6" />
          </div>
          <Skeleton className="w-2/3 h-4" />
          <div className="flex gap-2">
            <Skeleton className="w-16 h-5" />
            <Skeleton className="w-16 h-5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="p-6 space-y-6" role="status" aria-label="Loading settings">
      {/* Section */}
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <Skeleton className="w-32 h-5" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Skeleton className="w-1/4 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
                <Skeleton className="w-12 h-6" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" variant="circular" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-1/3 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-20" />
    </div>
  );
}
