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
import { Card } from '@/components/ui';
import { useChartTheme, tooltipContentStyle } from './chartTheme';

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
  const theme = useChartTheme();
  const chartData = data.map((d) => ({
    ...d,
    domainLabel: truncateDomain(d.domain),
  }));

  if (data.length === 0) {
    return (
      <Card className="p-4 h-64">
        <h3 className="text-sm font-medium text-ink-secondary mb-3">Requests by Domain</h3>
        <div className="flex items-center justify-center h-[85%] text-ink-muted text-sm">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-64">
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Requests by Domain</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
          <XAxis
            type="number"
            stroke={theme.axis}
            fontSize={10}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="domainLabel"
            stroke={theme.axis}
            fontSize={10}
            tickLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={tooltipContentStyle(theme)}
            formatter={(value, name, props) => {
              const numValue = Number(value) || 0;
              if (name === 'count') {
                return [
                  <div key="tooltip" className="space-y-1">
                    <div>{numValue} requests</div>
                    <div className="text-ink-muted">
                      Avg: {Math.round(props.payload.avgDuration)}ms
                    </div>
                    <div className="text-ink-muted">
                      Size: {formatBytes(props.payload.totalSize)}
                    </div>
                  </div>,
                  props.payload.domain,
                ];
              }
              return [numValue, name];
            }}
          />
          <Bar dataKey="count" fill={theme.accent} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
