import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesPoint } from '@/hooks/usePerformanceStats';
import { Card } from '@/components/ui';
import { useChartTheme, tooltipContentStyle } from './chartTheme';

interface RequestsPerSecondChartProps {
  data: TimeSeriesPoint[];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
}

export function RequestsPerSecondChart({ data }: RequestsPerSecondChartProps) {
  const theme = useChartTheme();

  return (
    <Card className="p-4 h-64">
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Requests per Second</h3>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={tooltipContentStyle(theme)}
            labelFormatter={(value) => formatTime(value as number)}
            formatter={(value) => [`${value ?? 0} req`, 'Requests']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={theme.accent}
            fill="url(#colorRps)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
