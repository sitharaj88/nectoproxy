import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { StatusStats } from '@/hooks/usePerformanceStats';
import { Card } from '@/components/ui';
import { useChartTheme, tooltipContentStyle } from './chartTheme';

interface RequestsByStatusChartProps {
  data: StatusStats[];
}

export function RequestsByStatusChart({ data }: RequestsByStatusChartProps) {
  const theme = useChartTheme();
  const filteredData = data.filter((d) => d.count > 0);

  if (filteredData.length === 0) {
    return (
      <Card className="p-4 h-64">
        <h3 className="text-sm font-medium text-ink-secondary mb-3">Status Codes</h3>
        <div className="flex items-center justify-center h-[85%] text-ink-muted text-sm">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-64">
      <h3 className="text-sm font-medium text-ink-secondary mb-3">Status Codes</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="count"
            nameKey="status"
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={false}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle(theme)}
            formatter={(value, name) => [`${value ?? 0} requests`, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-ink-muted">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
