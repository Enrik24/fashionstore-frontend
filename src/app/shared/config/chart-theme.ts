export const CHART_COLORS = {
  accent: '#e11d48',
  primary: '#0f172a',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  gold: '#d97706',
  neutral: '#64748b'
};

export const CHART_PALETTE = [
  CHART_COLORS.accent, CHART_COLORS.info, CHART_COLORS.success,
  CHART_COLORS.warning, CHART_COLORS.primary, CHART_COLORS.gold,
  CHART_COLORS.error, CHART_COLORS.neutral
];

export const BASE_CHART_OPTIONS: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: CHART_COLORS.primary, font: { family: 'Inter', size: 12 }, boxWidth: 12 } },
    tooltip: { backgroundColor: CHART_COLORS.primary, padding: 10, cornerRadius: 6 }
  }
};

export const SPARKLINE_OPTIONS: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 }, line: { borderWidth: 2, tension: 0.4 } }
};
