import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { TimeSeriesPoint } from '@/hooks/usePerformanceStats';

interface ErrorRateChartProps {
  data: TimeSeriesPoint[];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
}

export function ErrorRateChart({ data }: ErrorRateChartProps) {
  const hasErrors = data.some((d) => d.value > 0);

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-64">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Error Rate</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            domain={[0, 'auto']}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(value) => formatTime(value as number)}
            formatter={(value) => [`${(Number(value) || 0).toFixed(1)}%`, 'Error Rate']}
          />
          {hasErrors && (
            <ReferenceLine y={5} stroke="#eab308" strokeDasharray="5 5" />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={hasErrors ? '#ef4444' : '#22c55e'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
