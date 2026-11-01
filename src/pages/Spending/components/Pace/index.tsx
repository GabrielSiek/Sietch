import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { SpendingData } from '@shared/types';
import { areaFill, chartTheme, crosshair, stagger, tooltip } from '@/lib/charts';
import { brl, brlCompact, fmtMonthName } from '@/lib/format';
import { useStore } from '@/store';
import { Chip, Legend, Muted, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { ChartCanvas } from '@/components/ChartCanvas';
import { paceData, status, type Computed, type PaceData } from '../../logic';
import * as Styled from './styles';

export function Pace({ s, c, month }: { s: SpendingData; c: Computed; month: string }) {
  const pd = useMemo(() => paceData(s, c, month), [s, c, month]);
  const dark = useStore((st) => st.dark);
  // Rebuilt on theme changes too: the colors come from the CSS custom properties.
  const config = useMemo(() => paceChart(pd, month, c.prevMonth), [pd, month, c.prevMonth, dark]);

  let proj = null;
  if (pd.projection != null) {
    const st = pd.budgetTotal ? status(pd.projection / pd.budgetTotal) : null;
    proj = (
      <Styled.Projection>
        <Muted>Projeção para {pd.days} de {fmtMonthName(month)}:</Muted><b>{brl(pd.projection)}</b>
        {st && <Chip $tone={st.tone}>{st.label === 'Atenção' ? 'Perto do limite' : `${st.label === 'Dentro' ? 'Dentro' : 'Acima'} ${pd.budgetLabel === 'Renda' ? 'da renda' : 'do orçamento'}`}</Chip>}
      </Styled.Projection>
    );
  }
  return (
    <Styled.Container>
      <CardHeader title="Ritmo de gastos" sub="Acumulado no mês, dia a dia">
        <Legend>
          <span><Swatch $kind="line" $color="--accent" />{fmtMonthName(month)}</span>
          <span><Swatch $kind="dash" />{fmtMonthName(c.prevMonth)}</span>
          {pd.projection != null && <span><Swatch $kind="dot" />Projeção</span>}
          {pd.budgetTotal ? <span><Swatch $kind="line" $color="--warn" />{pd.budgetLabel}</span> : null}
        </Legend>
      </CardHeader>
      <ChartCanvas config={config} aria-label="Gasto acumulado do mês comparado ao anterior" />
      {proj}
    </Styled.Container>
  );
}

function paceChart(pd: PaceData, month: string, prevMonth: string): ChartConfiguration<'line', (number | null)[], number> {
  const t = chartTheme();
  const labels = Array.from({ length: pd.days }, (_, i) => i + 1);
  const cur = pd.cur.map((v, i) => (i < pd.todayDay ? v : null));
  const projection = pd.projection;
  const proj = projection != null ? labels.map((d) => (d < pd.todayDay ? null : pd.spent + ((projection - pd.spent) * (d - pd.todayDay)) / Math.max(pd.days - pd.todayDay, 1))) : [];
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: fmtMonthName(prevMonth), data: labels.map((d) => pd.prev[d - 1] ?? pd.prev.at(-1) ?? null), borderColor: t.muted, borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0, tension: 0.2 },
        {
          label: fmtMonthName(month), data: cur, borderColor: t.accent, borderWidth: 2.5, tension: 0.2, fill: 'start', backgroundColor: areaFill(t.accent),
          pointRadius: (ctx) => (ctx.dataIndex === pd.todayDay - 1 ? 5 : 0), pointBackgroundColor: t.accent, pointBorderColor: t.surface, pointBorderWidth: 3,
        },
        ...(proj.length ? [{ label: 'Projeção', data: proj, borderColor: t.accent, borderWidth: 2, borderDash: [2, 4], pointRadius: 0 }] : []),
        ...(pd.budgetTotal ? [{ label: pd.budgetLabel, data: labels.map(() => pd.budgetTotal), borderColor: t.warn, borderWidth: 2, pointRadius: 0 }] : []),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: stagger(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip(t), filter: (i) => i.raw != null, callbacks: { title: (it) => `Dia ${it[0].label}`, label: (i) => ` ${i.dataset.label}: ${brl(i.raw as number)}` } },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: (_v, i) => ([0, 7, 15, 22, pd.days - 1].includes(i) ? String(i + 1).padStart(2, '0') : '') } },
        y: { beginAtZero: true, grid: { color: t.border }, border: { display: false }, ticks: { maxTicksLimit: 5, callback: (v) => brlCompact(Number(v)) } },
      },
    },
    plugins: [crosshair],
  };
}
