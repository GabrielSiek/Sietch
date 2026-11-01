import { useEffect, useRef, type HTMLAttributes } from 'react';
import { Chart, type ChartConfiguration, type ChartDataset } from 'chart.js';
import { applyChartDefaults, reducedMotion } from '@/lib/charts';
import * as Styled from './styles';

interface ChartCanvasProps extends HTMLAttributes<HTMLCanvasElement> {
  /**
   * Memoize it (useMemo): the chart is updated whenever this changes, animating from the old data to the new.
   * A function gets the canvas, for options that depend on the rendered size.
   */
  config: ChartConfiguration | ((canvas: HTMLCanvasElement) => ChartConfiguration);
  /** Height of a responsive chart, px (default 240). */
  height?: number;
  /** Fixed square size, px, for charts with `responsive: false`. */
  size?: number;
  'aria-label': string;
}

export function ChartCanvas({ config, height, size, ...canvas }: ChartCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    applyChartDefaults();
    let next = typeof config === 'function' ? config(el) : config;
    if (reducedMotion()) next = { ...next, options: { ...next.options, animation: false } };
    const cur = chart.current;
    // A different chart type (or the first render) needs a new chart; otherwise morph the current one.
    if (!cur || (cur.config as ChartConfiguration).type !== next.type) {
      cur?.destroy();
      chart.current = new Chart(el, next);
      return;
    }
    cur.data.labels = next.data.labels;
    cur.data.datasets = next.data.datasets.map((ds, i) => reuse(cur.data.datasets[i], ds));
    cur.options = next.options ?? {};
    cur.update();
  }, [config]);

  useEffect(() => () => {
    chart.current?.destroy();
    chart.current = null;
  }, []);

  return (
    <Styled.Container $height={height} $size={size}>
      <canvas ref={ref} width={size} height={size} role="img" {...canvas} />
    </Styled.Container>
  );
}

/**
 * Chart.js tracks a dataset's elements by its object identity: copying the new props onto the old object
 * lets the bars, points and arcs animate to their new values instead of being rebuilt from zero.
 */
function reuse(prev: ChartDataset | undefined, next: ChartDataset) {
  if (!prev) return next;
  const target = prev as unknown as Record<string, unknown>;
  for (const key of Object.keys(target)) if (!(key in next)) delete target[key];
  return Object.assign(prev, next);
}
