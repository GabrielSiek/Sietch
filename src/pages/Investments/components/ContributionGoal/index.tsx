import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { cat } from '@/lib/categories';
import { cssVar } from '@/lib/charts';
import { addMonths, brl, fmtDay, fmtMonth, fmtMonthName, num, plural, todayIso } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { useStore } from '@/store';
import { Button, Chip, Empty, ListRow, Muted, RowMain, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import { ChartCanvas } from '@/components/ChartCanvas';
import type { monthContributions } from '../../derive';
import * as Styled from './styles';

interface Props {
  /** Monthly contribution goal, if set. */
  goal: number | null;
  month: ReturnType<typeof monthContributions>;
}

// Aporte do mês
export function ContributionGoal({ goal, month: { thisMonth, monthAportes, aportado, netOf } }: Props) {
  if (!goal) {
    return (
      <Styled.Container>
        <CardHeader title="Aporte do mês" sub="Meta mensal de investimento" />
        <Empty as="div">
          Você aportou <b>{brl(Math.max(aportado, 0))}</b> em {fmtMonthName(thisMonth)}. Defina uma meta mensal para acompanhar o ritmo.<br />
          <Button as="a" $size="sm" href="#/configuracoes"><Icon d={ICON.plus} size={16} />Definir meta</Button>
        </Empty>
      </Styled.Container>
    );
  }

  const ratio = Math.max(aportado, 0) / goal;
  const left = Math.max(goal - aportado, 0);
  const [y, m] = thisMonth.split('-').map(Number);
  const daysLeft = new Date(Date.UTC(y, m, 0)).getUTCDate() - Number(todayIso().slice(8, 10));
  const months = Array.from({ length: 12 }, (_, k) => addMonths(thisMonth, k - 11));
  const net = Object.fromEntries(months.map((mm) => [mm, netOf(mm)]));
  const past = months.slice(0, -1);
  const hits = past.filter((mm) => net[mm] >= goal).length;

  return (
    <Styled.Container>
      <CardHeader title={`Aporte de ${fmtMonthName(thisMonth)}`} sub="Meta mensal de investimento">
        <Chip $tone={ratio >= 1 ? 'pos' : 'warn'}>{ratio >= 1 ? 'Meta batida' : plural(daysLeft, 'dia restante', 'dias restantes')}</Chip>
      </CardHeader>
      <Styled.Progress>
        <GoalRing ratio={ratio} />
        <Styled.Figures>
          <Muted as="small">Aportado</Muted>
          <Styled.Amount>{brl(Math.max(aportado, 0))}</Styled.Amount>
          <Muted as="small">de {brl(goal)}</Muted>
          <Styled.Left>{left > 0 ? `Faltam ${brl(left)}` : 'Meta concluída'}</Styled.Left>
        </Styled.Figures>
      </Styled.Progress>
      <div>
        {monthAportes.slice(0, 3).map((a, i) => (
          <ListRow key={i}>
            <Swatch as="span" $color={cat(a.category).color} />
            <RowMain><b>{a.name}</b><small>{fmtDay(a.date)}{a.quantity ? ` · ${num(a.quantity)} cotas` : ` · ${cat(a.category).label}`}</small></RowMain>
            <b>{brl(a.delta)}</b>
          </ListRow>
        ))}
        {!monthAportes.length && <Styled.NoneYet>Nenhum aporte registrado neste mês ainda.</Styled.NoneYet>}
      </div>
      <Styled.History>
        <Muted as="small">Meta batida em {hits} dos últimos {past.length} meses</Muted>
        <Styled.Months>
          {months.map((mm, i) => {
            const current = i === months.length - 1;
            const hit = net[mm] >= goal;
            const bg = current ? 'var(--surface-2)' : hit ? 'var(--pos)' : 'var(--neg-soft)';
            return (
              <Styled.Month key={mm} title={`${fmtMonth(`${mm}-01`)}: ${brl(net[mm])}${current ? ' (em andamento)' : hit ? ' · meta batida' : ' · meta não batida'}`}>
                <Styled.MonthBar $current={current} style={{ background: bg }} />
                <span>{fmtMonth(`${mm}-01`)}</span>
              </Styled.Month>
            );
          })}
        </Styled.Months>
      </Styled.History>
    </Styled.Container>
  );
}

/** Progress ring that sweeps up to the share of the goal reached. */
function GoalRing({ ratio }: { ratio: number }) {
  const dark = useStore((s) => s.dark);
  const done = Math.min(ratio, 1);
  const config = useMemo((): ChartConfiguration<'doughnut', number[], string> => ({
    type: 'doughnut',
    data: { datasets: [{ data: [done, 1 - done], backgroundColor: [cssVar('--accent'), cssVar('--surface-2')], borderWidth: 0 }] },
    options: { responsive: false, cutout: '79%', events: [], plugins: { legend: { display: false }, tooltip: { enabled: false } } },
  }), [done, dark]);
  return (
    <Styled.Ring>
      <ChartCanvas config={config} size={112} aria-label={`Meta de aporte ${Math.round(ratio * 100)}% concluída`} />
      <Styled.RingHole>{Math.round(ratio * 100)}%</Styled.RingHole>
    </Styled.Ring>
  );
}
