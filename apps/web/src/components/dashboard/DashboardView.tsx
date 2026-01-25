import { Activity, AlertTriangle, Clock, Gauge, Database, Zap } from 'lucide-react';
import { usePerformanceStats } from '@/hooks/usePerformanceStats';
import { StatCard, TopSlowestRequests } from './widgets';
import {
  RequestsPerSecondChart,
  ErrorRateChart,
  ResponseTimeHistogram,
  RequestsByDomainChart,
  RequestsByStatusChart,
} from './charts';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function DashboardView() {
  const stats = usePerformanceStats();

  return (
    <div className="h-full overflow-auto p-4 bg-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-400" />
            Performance Dashboard
          </h1>
          <span className="text-sm text-gray-400">
            Last 60 seconds
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Requests"
            value={stats.totalRequests}
            icon={<Activity className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            title="Avg Response"
            value={formatDuration(stats.avgResponseTime)}
            subtitle={`Median: ${formatDuration(stats.medianResponseTime)}`}
            icon={<Clock className="w-4 h-4" />}
            color={stats.avgResponseTime < 300 ? 'green' : stats.avgResponseTime < 1000 ? 'yellow' : 'red'}
          />
          <StatCard
            title="P95 Response"
            value={formatDuration(stats.p95ResponseTime)}
            subtitle={`P99: ${formatDuration(stats.p99ResponseTime)}`}
            icon={<Zap className="w-4 h-4" />}
            color={stats.p95ResponseTime < 500 ? 'green' : stats.p95ResponseTime < 2000 ? 'yellow' : 'red'}
          />
          <StatCard
            title="Error Rate"
            value={`${stats.errorRate}%`}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={stats.errorRate < 1 ? 'green' : stats.errorRate < 5 ? 'yellow' : 'red'}
          />
          <StatCard
            title="Total Size"
            value={formatBytes(stats.totalSize)}
            icon={<Database className="w-4 h-4" />}
            color="gray"
          />
          <StatCard
            title="Min/Max"
            value={`${formatDuration(stats.minResponseTime)} / ${formatDuration(stats.maxResponseTime)}`}
            icon={<Gauge className="w-4 h-4" />}
            color="gray"
          />
        </div>

        {/* Charts - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RequestsPerSecondChart data={stats.requestsPerSecond} />
          <ErrorRateChart data={stats.errorRateOverTime} />
        </div>

        {/* Charts - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          <ResponseTimeHistogram data={stats.responseTimeDistribution} />
        </div>

        {/* Charts - Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RequestsByDomainChart data={stats.requestsByDomain} />
          <RequestsByStatusChart data={stats.requestsByStatus} />
        </div>

        {/* Slowest Requests */}
        <TopSlowestRequests requests={stats.slowestRequests} />

        {/* Methods Breakdown */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Requests by Method</h3>
          <div className="flex flex-wrap gap-3">
            {stats.requestsByMethod.map(({ method, count, color }) => (
              <div
                key={method}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700/50"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-mono text-gray-300">{method}</span>
                <span className="text-sm text-gray-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
