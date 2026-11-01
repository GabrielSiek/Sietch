import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { segmentsOf } from '@shared/segments';
import { CATEGORIES } from '@/lib/categories';
import { cssVar } from '@/lib/charts';
import { brl, brl0, pct, plural } from '@/lib/format';
import { useStore } from '@/store';
import { Button, Empty, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { ChartCanvas } from '@/components/ChartCanvas';
import { donutRows, type ClassFilter, type Derived } from '../../derive';
import * as Styled from './styles';

interface Props {
  d: Derived;
  /** A class picked in the class cards: shows its segments instead of the whole wallet. */
  filter: ClassFilter;
  onClear: () => void;
}

export function Distribution({ d, filter, onClear }: Props) {
  const dark = useStore((s) => s.dark);
  const rows = useMemo(() => donutRows(d, filter), [d, filter]);
  const [hover, setHover] = useState(-1);
  const r = rows[hover];
  const total = filter === 'ALL' ? d.total : d.classes[filter].value;
  const count = filter === 'ALL' ? d.investments.length : d.classes[filter].count;
  const name = filter === 'ALL' ? 'carteira' : CATEGORIES[filter].label;

  const config = useMemo((): ChartConfiguration<'doughnut', number[], string> => ({
    type: 'doughnut',
    data: { labels: rows.map((x) => x.label), datasets: [{ data: rows.map((x) => x.value), backgroundColor: rows.map((x) => cssVar(x.color)), borderColor: cssVar('--surface'), borderWidth: 3, hoverOffset: 4 }] },
    options: { responsive: false, animation: { animateScale: true }, cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, onHover: (_e, els) => setHover(els[0]?.index ?? -1) },
  }), [rows, dark]);

  return (
    <Styled.Container>
      <CardHeader
        center
        title={filter === 'ALL' ? 'Distribuição da carteira' : `Distribuição · ${name}`}
        sub={filter === 'ALL' ? 'Por classe de ativo' : segmentsOf(filter) ? 'Por segmento' : 'Por tipo'}
      >
        {filter !== 'ALL' && <Button $size="sm" onClick={onClear}>Carteira toda</Button>}
      </CardHeader>
      <Styled.DonutBox>
        <Styled.Donut>
          <ChartCanvas config={config} size={212} aria-label={`Distribuição da ${filter === 'ALL' ? 'carteira por classe' : `classe ${name}`}`} onMouseLeave={() => setHover(-1)} />
          <Styled.Center>
            <span>{r ? r.label : filter === 'ALL' ? 'Total' : name}</span>
            <b>{r ? pct(total ? r.value / total : 0) : brl0(total)}</b>
            <span>{r ? brl0(r.value) : plural(count, 'ativo', 'ativos')}</span>
          </Styled.Center>
        </Styled.Donut>
      </Styled.DonutBox>
      <div>
        {rows.map((x, idx) => (
          <Styled.LegendRow key={x.key} $hl={idx === hover} onMouseEnter={() => setHover(idx)} onMouseLeave={() => setHover(-1)}>
            <Swatch as="span" $color={x.color} />
            <Styled.RowLabel>{x.label}</Styled.RowLabel>
            <Styled.RowValue>{brl(x.value)}</Styled.RowValue>
            <Styled.RowShare>{pct(total ? x.value / total : 0)}</Styled.RowShare>
          </Styled.LegendRow>
        ))}
        {!rows.length && <Empty>{filter === 'ALL' ? 'Sem investimentos.' : 'Nenhum ativo com saldo nesta classe.'}</Empty>}
      </div>
    </Styled.Container>
  );
}
