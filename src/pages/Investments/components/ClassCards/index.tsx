import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { CategoryKey, Goals, Portfolio } from '@shared/types';
import { ASSET_CLASSES, CATEGORIES, CORE_CATEGORIES, segmentLabel, subtypeLabel } from '@/lib/categories';
import { areaFill, cssVar, stagger } from '@/lib/charts';
import { arrowPct, brl, pct, plural, signedPct } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { useStore } from '@/store';
import { Chip, Tile, toneOf } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ChartCanvas } from '@/components/ChartCanvas';
import type { ClassFilter, Derived } from '../../derive';
import * as Styled from './styles';

interface Props {
  p: Portfolio;
  d: Derived;
  filter: ClassFilter;
  onToggle: (key: CategoryKey) => void;
  /** Allocation targets, % per class: a class you aim to hold gets a card even while empty. */
  targets: Goals['allocation'];
}

export function ClassCards({ p, d, filter, onToggle, targets }: Props) {
  const keys = ASSET_CLASSES.filter((k) => CORE_CATEGORIES.includes(k) || d.classes[k].value > 0 || (targets[k] ?? 0) > 0);
  const sparks = useMemo(() => {
    const hist = p.history.slice(-90);
    return Object.fromEntries(ASSET_CLASSES.map((k) => [k, hist.map((h) => h.byCategory?.[k] ?? 0)])) as Record<CategoryKey, number[]>;
  }, [p.history]);
  return (
    <Styled.Container>
      {keys.map((k) => {
        const c = d.classes[k];
        const meta = CATEGORIES[k];
        // The two biggest segments ("Papel e Tijolo"), or subtypes for classes that aren't split.
        const segs = Object.entries(c.segments).filter(([s, v]) => s && v > 0);
        const mix = segs.length
          ? segs.sort((a, b) => b[1] - a[1]).slice(0, 2).map(([s]) => segmentLabel(k, s))
          : Object.entries(c.subtypes).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([s]) => subtypeLabel(s));
        const sub = c.count ? (mix.length ? mix.join(' e ') : plural(c.count, 'ativo', 'ativos')) : 'Nenhum ativo';
        const month = c.monthW ? c.monthV / c.monthW / 100 : null;
        const spark = sparks[k];
        const sparkOk = spark.filter((v) => v > 0).length >= 3;
        return (
          <Styled.Card key={k} aria-pressed={filter === k} onClick={() => onToggle(k)}>
            <Styled.Top>
              <Tile $size={38} $color={meta.color}><Icon d={ICON[meta.icon]} size={19} /></Tile>
              <Styled.Names><b>{meta.label}</b><small>{sub}</small></Styled.Names>
            </Styled.Top>
            <Styled.Body>
              <Styled.Value>{brl(c.value)}</Styled.Value>
              <Styled.Meta>
                <Chip $tone="neutral">{pct(d.total ? c.value / d.total : 0)}</Chip>
                {month != null && <Chip $tone={toneOf(month)}>{arrowPct(month)} no mês</Chip>}
                {c.cost > 0 && <span>{signedPct(c.profit / c.cost)} desde o início</span>}
              </Styled.Meta>
            </Styled.Body>
            {sparkOk
              ? <Spark values={spark} color={meta.color} label={`Evolução de ${meta.label} nos últimos 90 dias`} />
              : <Styled.SparkEmpty>Histórico em construção</Styled.SparkEmpty>}
          </Styled.Card>
        );
      })}
    </Styled.Container>
  );
}

/** 90-day trend of a class, drawn edge to edge under its card. */
function Spark({ values, color, label }: { values: number[]; color: string; label: string }) {
  const dark = useStore((s) => s.dark);
  const config = useMemo((): ChartConfiguration<'line', number[], number> => {
    const c = cssVar(color);
    return {
      type: 'line',
      data: { labels: values.map((_, i) => i), datasets: [{ data: values, borderColor: c, borderWidth: 2, tension: 0.3, pointRadius: 0, fill: 'start', backgroundColor: areaFill(c) }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: stagger(500), events: [],
        layout: { padding: { top: 4, bottom: 4 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    };
  }, [values, color, dark]);
  return <ChartCanvas config={config} height={44} aria-label={label} aria-hidden="true" />;
}
