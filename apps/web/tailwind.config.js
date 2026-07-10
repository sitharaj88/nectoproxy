/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic, token-driven palette (theme via CSS vars, alpha-capable)
        canvas: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-2) / <alpha-value>)',
          overlay: 'rgb(var(--color-overlay) / <alpha-value>)',
        },
        edge: {
          subtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-text) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
          faint: 'rgb(var(--color-text-faint) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--color-accent-fg) / <alpha-value>)',
        },
        success: 'rgb(var(--color-success) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        warn: 'rgb(var(--color-warn) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        // `primary` remapped to the indigo accent family so existing
        // primary-* usages adopt the new signature accent for free.
        primary: {
          50: '#eef0ff',
          100: '#e0e3ff',
          200: '#c6ccff',
          300: '#a5adff',
          400: '#8b95ff',
          500: '#6d7bfa',
          600: '#5661e6',
          700: '#4a52c4',
          800: '#3d449e',
          900: '#353b7e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        popover: 'var(--shadow-popover)',
      },
      borderRadius: {
        md: '6px',
      },
      ringColor: {
        DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
