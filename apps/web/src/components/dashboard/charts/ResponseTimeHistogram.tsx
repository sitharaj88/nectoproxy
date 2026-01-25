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

interface ResponseTimeHistogramProps {
  data: DistributionBucket[];
}

function getBarColor(bucket: string): string {
  if (bucket.includes('0-100')) return '#22c55e'; // green - fast
  if (bucket.includes('100-300')) return '#84cc16'; // lime
  if (bucket.includes('300-500')) return '#eab308'; // yellow
  if (bucket.includes('500ms-1s')) return '#f97316'; // orange
  if (bucket.includes('1-3s')) return '#ef4444'; // red
  return '#dc2626'; // dark red - very slow
}

export function ResponseTimeHistogram({ data }: ResponseTimeHistogramProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 h-64">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Response Time Distribution</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis
            dataKey="bucket"
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value ?? 0} requests`, 'Count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.bucket)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
