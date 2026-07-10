import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

const colorClasses: Record<NonNullable<StatCardProps['color']>, string> = {
  blue: 'text-accent',
  green: 'text-success',
  yellow: 'text-warn',
  red: 'text-danger',
  gray: 'text-ink-secondary',
};

export function StatCard({ title, value, subtitle, icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <Card className="p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-ink-muted">{title}</span>
        {icon && <span className={colorClasses[color]}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</span>
        {trend && (
          <span className={`text-sm ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
        )}
      </div>
      {subtitle && <span className="text-xs text-ink-faint mt-1">{subtitle}</span>}
    </Card>
  );
}
