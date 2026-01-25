import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DomainStats } from '@/hooks/usePerformanceStats';

interface RequestsByDomainChartProps {
  data: DomainStats[];
}

function truncateDomain(domain: string, maxLength = 20): string {
  if (domain.length <= maxLength) return domain;
  return domain.substring(0, maxLength - 3) + '...';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function RequestsByDomainChart({ data }: RequestsByDomainChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    domainLabel: truncateDomain(d.domain),
  }));

  if (data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 h-64">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Requests by Domain</h3>
        <div className="flex items-center justify-center h-[85%] text-gray-500 text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-64">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Requests by Domain</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="domainLabel"
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value, name, props) => {
              const numValue = Number(value) || 0;
              if (name === 'count') {
                return [
                  <div key="tooltip" className="space-y-1">
                    <div>{numValue} requests</div>
                    <div className="text-gray-400">
                      Avg: {Math.round(props.payload.avgDuration)}ms
                    </div>
                    <div className="text-gray-400">
                      Size: {formatBytes(props.payload.totalSize)}
                    </div>
                  </div>,
                  props.payload.domain,
                ];
              }
              return [numValue, name];
            }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
