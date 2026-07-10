import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DistributionBucket } from '@/hooks/usePerformanceStats';
import { Card } from '@/components/ui';
import { useChartTheme, tooltipContentStyle, type ChartTheme } from './chartTheme';

interface ResponseTimeHistogramProps {
  data: DistributionBucket[];
}

function getBarColor(bucket: string, theme: ChartTheme): string {
  if (bucket.includes('0-100')) return theme.ramp[0]; // fast
  if (bucket.includes('100-300')) return theme.ramp[1];
  if (bucket.includes('300-500')) return theme.ramp[2];
  if (bucket.includes('500ms-1s')) return theme.ramp[3];
  if (bucket.includes('1-3s')) return theme.ramp[4];
  return theme.ramp[5]; // very slow
}

export function ResponseTimeHistogram({ data }: ResponseTimeHistogramProps) {
  const theme = useChartTheme();

  return (
    <Card className="p-4 h-64">
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Response Time Distribution</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
          <XAxis
            dataKey="bucket"
            stroke={theme.axis}
            fontSize={10}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke={theme.axis}
            fontSize={10}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={tooltipContentStyle(theme)}
            formatter={(value) => [`${value ?? 0} requests`, 'Count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.bucket, theme)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
