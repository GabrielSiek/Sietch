import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { Portfolio } from '@shared/types';
import { CATEGORIES } from '@/lib/categories';
import { chartTheme, cssVar, stagger, tooltip } from '@/lib/charts';
import { brl, brlCompact, fmtMonth, fmtMonthYear } from '@/lib/format';
import { useStore } from '@/store';
import { Empty, Legend, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { ChartCanvas } from '@/components/ChartCanvas';
import { incomeData } from '../../derive';
import * as Styled from './styles';

export function Income({ p }: { p: Portfolio }) {
  const dark = useStore((s) => s.dark);
  const data = useMemo(() => incomeData(p), [p]);
  const { months, byCat, cats, total } = data;

  const config = useMemo((): ChartConfiguration<'bar', number[], string> => {
    const t = chartTheme();
    const totals = months.map((_, i) => cats.reduce((s, k) => s + byCat[k]![i], 0));
    return {
      type: 'bar',
      data: {
        labels: months,
        datasets: cats.map((k, ci) => ({
          label: CATEGORIES[k].label, data: byCat[k]!, backgroundColor: cssVar(CATEGORIES[k].color),
          borderRadius: ci === cats.length - 1 ? { topLeft: 6, topRight: 6 } : 0, borderSkipped: false,
          borderColor: t.surface, borderWidth: { top: ci === 0 ? 0 : 2 }, maxBarThickness: 36,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: stagger(500, 120),
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltip(t), filter: (i) => (i.raw as number) > 0, callbacks: { title: (it) => fmtMonthYear(`${months[it[0].dataIndex]}-01`), label: (i) => ` ${i.dataset.label}: ${brl(i.raw as number)}`, footer: (it) => `Total: ${brl(totals[it[0].dataIndex])}` } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: (c) => (c.index === 11 ? t.text : t.muted), font: (c) => ({ weight: c.index === 11 ? 700 : 500 }), callback: (_v, i) => fmtMonth(`${months[i]}-01`) } },
          y: { stacked: true, beginAtZero: true, grid: { color: t.border }, border: { display: false }, ticks: { maxTicksLimit: 4, callback: (v) => brlCompact(Number(v)) } },
        },
      },
    };
  }, [months, byCat, cats, dark]);

  return (
    <Styled.Container>
      <CardHeader title="Proventos" sub="Dividendos, JCP e rendimentos · últimos 12 meses">
        <Styled.Totals>
          <Styled.Total><span>Total no período</span><b>{brl(total)}</b></Styled.Total>
          <Styled.Total><span>Média mensal</span><b>{brl(total / 12)}</b></Styled.Total>
        </Styled.Totals>
      </CardHeader>
      {cats.length
        ? (
          <>
            <Legend>{cats.map((k) => <span key={k}><Swatch $color={CATEGORIES[k].color} />{CATEGORIES[k].label}</span>)}</Legend>
            <ChartCanvas config={config} height={210} aria-label="Proventos por mês" />
          </>
        )
        : <Empty>Nenhum provento (dividendos, JCP, rendimentos de FII, cupons) foi informado pelas instituições conectadas.</Empty>}
    </Styled.Container>
  );
}
