import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { StatusStats } from '@/hooks/usePerformanceStats';

interface RequestsByStatusChartProps {
  data: StatusStats[];
}

export function RequestsByStatusChart({ data }: RequestsByStatusChartProps) {
  const filteredData = data.filter((d) => d.count > 0);

  if (filteredData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 h-64">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Status Codes</h3>
        <div className="flex items-center justify-center h-[85%] text-gray-500 text-sm">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-64">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Status Codes</h3>
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
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value, name) => [`${value ?? 0} requests`, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-gray-400">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
