import { useMemo } from 'react';
import { useFilteredEntries } from '@/stores/trafficStore';
import type { TrafficEntry } from '@proxyscope/shared';

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface DistributionBucket {
  bucket: string;
  count: number;
  min: number;
  max: number;
}

export interface DomainStats {
  domain: string;
  count: number;
  avgDuration: number;
  totalSize: number;
}

export interface StatusStats {
  status: string;
  count: number;
  color: string;
}

export interface PerformanceStats {
  totalRequests: number;
  avgResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  totalSize: number;
  requestsPerSecond: TimeSeriesPoint[];
  errorRateOverTime: TimeSeriesPoint[];
  responseTimeDistribution: DistributionBucket[];
  requestsByDomain: DomainStats[];
  requestsByStatus: StatusStats[];
  slowestRequests: TrafficEntry[];
  requestsByMethod: { method: string; count: number; color: string }[];
}

function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

function getStatusColor(status: number | null): string {
  if (!status) return '#6b7280'; // gray
  if (status < 200) return '#3b82f6'; // blue - informational
  if (status < 300) return '#22c55e'; // green - success
  if (status < 400) return '#3b82f6'; // blue - redirect
  if (status < 500) return '#eab308'; // yellow - client error
  return '#ef4444'; // red - server error
}

function getStatusLabel(status: number | null): string {
  if (!status) return 'Pending';
  if (status < 200) return '1xx';
  if (status < 300) return '2xx';
  if (status < 400) return '3xx';
  if (status < 500) return '4xx';
  return '5xx';
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '#22c55e',
    POST: '#3b82f6',
    PUT: '#eab308',
    PATCH: '#f97316',
    DELETE: '#ef4444',
    OPTIONS: '#6b7280',
    HEAD: '#a855f7',
  };
  return colors[method.toUpperCase()] || '#6b7280';
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function median(arr: number[]): number {
  return percentile(arr, 50);
}

export function usePerformanceStats(): PerformanceStats {
  const entries = useFilteredEntries();

  return useMemo(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Filter entries with valid timestamps
    const validEntries = entries.filter((e) => e.timestamp);

    // Calculate response times
    const durations = validEntries
      .filter((e) => e.duration != null && e.duration > 0)
      .map((e) => e.duration!);

    const avgResponseTime =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Calculate error rate
    const errors = validEntries.filter((e) => e.status && e.status >= 400);
    const errorRate = validEntries.length > 0 ? (errors.length / validEntries.length) * 100 : 0;

    // Calculate total size
    const totalSize = validEntries.reduce((acc, e) => {
      const size = e.responseBodySize || 0;
      return acc + size;
    }, 0);

    // Requests per second (last 60 seconds, 1-second buckets)
    const rpsMap = new Map<number, number>();
    for (let t = oneMinuteAgo; t <= now; t += 1000) {
      rpsMap.set(Math.floor(t / 1000) * 1000, 0);
    }
    for (const entry of validEntries) {
      const bucket = Math.floor(entry.timestamp / 1000) * 1000;
      if (bucket >= oneMinuteAgo) {
        rpsMap.set(bucket, (rpsMap.get(bucket) || 0) + 1);
      }
    }
    const requestsPerSecond: TimeSeriesPoint[] = Array.from(rpsMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Error rate over time (last 60 seconds, 5-second buckets)
    const errorRateMap = new Map<number, { total: number; errors: number }>();
    for (let t = oneMinuteAgo; t <= now; t += 5000) {
      errorRateMap.set(Math.floor(t / 5000) * 5000, { total: 0, errors: 0 });
    }
    for (const entry of validEntries) {
      const bucket = Math.floor(entry.timestamp / 5000) * 5000;
      if (bucket >= oneMinuteAgo) {
        const current = errorRateMap.get(bucket) || { total: 0, errors: 0 };
        current.total++;
        if (entry.status && entry.status >= 400) {
          current.errors++;
        }
        errorRateMap.set(bucket, current);
      }
    }
    const errorRateOverTime: TimeSeriesPoint[] = Array.from(errorRateMap.entries())
      .map(([timestamp, { total, errors }]) => ({
        timestamp,
        value: total > 0 ? (errors / total) * 100 : 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Response time distribution
    const buckets = [
      { label: '0-100ms', min: 0, max: 100 },
      { label: '100-300ms', min: 100, max: 300 },
      { label: '300-500ms', min: 300, max: 500 },
      { label: '500ms-1s', min: 500, max: 1000 },
      { label: '1-3s', min: 1000, max: 3000 },
      { label: '3s+', min: 3000, max: Infinity },
    ];
    const responseTimeDistribution: DistributionBucket[] = buckets.map(({ label, min, max }) => ({
      bucket: label,
      count: durations.filter((d) => d >= min && d < max).length,
      min,
      max,
    }));

    // Requests by domain
    const domainMap = new Map<string, { count: number; durations: number[]; sizes: number[] }>();
    for (const entry of validEntries) {
      const domain = getDomain(entry.url);
      const current = domainMap.get(domain) || { count: 0, durations: [], sizes: [] };
      current.count++;
      if (entry.duration) current.durations.push(entry.duration);
      if (entry.responseBodySize) current.sizes.push(entry.responseBodySize);
      domainMap.set(domain, current);
    }
    const requestsByDomain: DomainStats[] = Array.from(domainMap.entries())
      .map(([domain, { count, durations, sizes }]) => ({
        domain,
        count,
        avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        totalSize: sizes.reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Requests by status
    const statusMap = new Map<string, number>();
    for (const entry of validEntries) {
      const label = getStatusLabel(entry.status);
      statusMap.set(label, (statusMap.get(label) || 0) + 1);
    }
    const requestsByStatus: StatusStats[] = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status,
        count,
        color: getStatusColor(status === '2xx' ? 200 : status === '3xx' ? 300 : status === '4xx' ? 400 : status === '5xx' ? 500 : 0),
      }))
      .sort((a, b) => a.status.localeCompare(b.status));

    // Requests by method
    const methodMap = new Map<string, number>();
    for (const entry of validEntries) {
      const method = entry.method.toUpperCase();
      methodMap.set(method, (methodMap.get(method) || 0) + 1);
    }
    const requestsByMethod = Array.from(methodMap.entries())
      .map(([method, count]) => ({
        method,
        count,
        color: getMethodColor(method),
      }))
      .sort((a, b) => b.count - a.count);

    // Slowest requests
    const slowestRequests = [...validEntries]
      .filter((e) => e.duration != null)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    return {
      totalRequests: validEntries.length,
      avgResponseTime: Math.round(avgResponseTime),
      medianResponseTime: Math.round(median(durations)),
      p95ResponseTime: Math.round(percentile(durations, 95)),
      p99ResponseTime: Math.round(percentile(durations, 99)),
      minResponseTime: durations.length > 0 ? Math.round(Math.min(...durations)) : 0,
      maxResponseTime: durations.length > 0 ? Math.round(Math.max(...durations)) : 0,
      errorRate: Math.round(errorRate * 100) / 100,
      totalSize,
      requestsPerSecond,
      errorRateOverTime,
      responseTimeDistribution,
      requestsByDomain,
      requestsByStatus,
      slowestRequests,
      requestsByMethod,
    };
  }, [entries]);
}
