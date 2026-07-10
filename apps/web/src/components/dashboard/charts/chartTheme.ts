import { useEffect, useState } from 'react';

/**
 * Recharts renders to inline SVG attributes and cannot consume Tailwind
 * semantic classes, so we read the design-system CSS variables at runtime and
 * hand Recharts concrete `rgb(...)` strings. The values are re-read whenever the
 * `class` on <html> changes (the theme toggle swaps `dark`/`light`), keeping
 * every chart legible in both themes.
 */
export interface ChartTheme {
  grid: string;
  axis: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  accent: string;
  success: string;
  info: string;
  warn: string;
  danger: string;
  /** Ordered severity ramp (fast -> slow) for distribution buckets. */
  ramp: string[];
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `rgb(${value})` : fallback;
}

function readTheme(): ChartTheme {
  const success = readVar('--color-success', 'rgb(63 185 80)');
  const info = readVar('--color-info', 'rgb(88 166 255)');
  const warn = readVar('--color-warn', 'rgb(210 153 34)');
  const danger = readVar('--color-danger', 'rgb(248 81 73)');
  return {
    grid: readVar('--color-border', 'rgb(42 47 58)'),
    axis: readVar('--color-text-muted', 'rgb(125 133 149)'),
    text: readVar('--color-text-secondary', 'rgb(180 186 198)'),
    tooltipBg: readVar('--color-overlay', 'rgb(30 34 42)'),
    tooltipBorder: readVar('--color-border', 'rgb(42 47 58)'),
    accent: readVar('--color-accent', 'rgb(109 123 250)'),
    success,
    info,
    warn,
    danger,
    ramp: [success, success, warn, warn, danger, danger],
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readTheme);

  useEffect(() => {
    const update = () => setTheme(readTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/** Shared Recharts <Tooltip> contentStyle built from the active theme. */
export function tooltipContentStyle(theme: ChartTheme): React.CSSProperties {
  return {
    backgroundColor: theme.tooltipBg,
    border: `1px solid ${theme.tooltipBorder}`,
    borderRadius: '6px',
    fontSize: '12px',
    color: theme.text,
  };
}
