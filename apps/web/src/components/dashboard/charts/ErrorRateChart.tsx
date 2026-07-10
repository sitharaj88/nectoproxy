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
import { Card } from '@/components/ui';
import { useChartTheme, tooltipContentStyle } from './chartTheme';

interface ErrorRateChartProps {
  data: TimeSeriesPoint[];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
}

export function ErrorRateChart({ data }: ErrorRateChartProps) {
  const theme = useChartTheme();
  const hasErrors = data.some((d) => d.value > 0);

  return (
    <Card className="p-4 h-64">
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Error Rate</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke={theme.axis}
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke={theme.axis}
            fontSize={10}
            tickLine={false}
            domain={[0, 'auto']}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={tooltipContentStyle(theme)}
            labelFormatter={(value) => formatTime(value as number)}
            formatter={(value) => [`${(Number(value) || 0).toFixed(1)}%`, 'Error Rate']}
          />
          {hasErrors && (
            <ReferenceLine y={5} stroke={theme.warn} strokeDasharray="5 5" />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={hasErrors ? theme.danger : theme.success}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
