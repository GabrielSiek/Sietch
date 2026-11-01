// Chart.js setup and shared chart styling. Colors come from the CSS custom properties, so rebuild a
// chart's config when the theme changes (include `dark` from the store in its useMemo deps).
import { Chart, registerables, type Plugin, type ScriptableContext, type TooltipOptions } from 'chart.js';

Chart.register(...registerables);

// Charts that have had their first render: the entrance stagger only plays once, later updates morph in place.
const introduced = new WeakSet<Chart>();
Chart.register({ id: 'intro', afterUpdate: (chart: Chart) => { introduced.add(chart); } });

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Entrance animation for a chart's first render: points and bars rise one after another, left to right,
 * over `spread` ms; each dataset starts `perDataset` ms after the previous one (stacked bars build up).
 */
export function stagger(spread = 600, perDataset = 0) {
  return {
    delay: (ctx: { type: string; dataIndex: number; datasetIndex: number; chart: Chart }) => {
      if (ctx.type !== 'data' || introduced.has(ctx.chart)) return 0;
      const n = Math.max((ctx.chart.data.labels?.length ?? 1) - 1, 1);
      return (ctx.dataIndex / n) * spread + ctx.datasetIndex * perDataset;
    },
  };
}

export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export interface ChartTheme { text: string; muted: string; border: string; surface: string; accent: string; warn: string }

export function chartTheme(): ChartTheme {
  return {
    text: cssVar('--text'), muted: cssVar('--muted'), border: cssVar('--border'), surface: cssVar('--surface'),
    accent: cssVar('--accent'), warn: cssVar('--warn'),
  };
}

export function applyChartDefaults() {
  Chart.defaults.font.family = "'Geist', system-ui, sans-serif";
  Chart.defaults.color = cssVar('--muted');
  Chart.defaults.set('animation', { duration: 800, easing: 'easeOutQuart' });
}

export function tooltip(t: ChartTheme): Partial<TooltipOptions> {
  return {
    backgroundColor: t.text, titleColor: t.surface, bodyColor: t.surface, footerColor: t.surface,
    borderWidth: 0, padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
    titleFont: { weight: 600 }, footerFont: { weight: 600 },
  };
}

/** Dashed vertical line at the hovered point. */
export const crosshair: Plugin = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length) return;
    const { ctx, chartArea: { top, bottom } } = chart;
    ctx.save();
    ctx.strokeStyle = cssVar('--muted');
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(active[0].element.x, top);
    ctx.lineTo(active[0].element.x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

/** Fill gradient for an area under a line. */
export const areaFill = (color: string) => (ctx: ScriptableContext<'line'>) => {
  const area = ctx.chart.chartArea;
  if (!area) return 'transparent';
  const g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, hexAlpha(color, 0.16));
  g.addColorStop(1, hexAlpha(color, 0));
  return g;
};

export function hexAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
