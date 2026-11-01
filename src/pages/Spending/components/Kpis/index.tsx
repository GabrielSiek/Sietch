import type { Goals, SpendingData } from '@shared/types';
import { brl, brl0, daysInMonth, fmtMonthName, num, plural, todayIso } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { Bar, BarFill, Chip, Legend, Swatch, Toned } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { budgetLimit, status, sum, type Computed } from '../../logic';
import { SplitBar } from '../../styles';
import * as Styled from './styles';

interface KpisProps {
  s: SpendingData;
  c: Computed;
  goals: Goals;
  month: string;
  account: string;
}

export function Kpis({ s, c, goals, month, account }: KpisProps) {
  return (
    <Styled.Container>
      <SpendKpi c={c} month={month} account={account} />
      <InvestKpi c={c} goals={goals} month={month} />
      <BalanceKpi s={s} c={c} month={month} />
    </Styled.Container>
  );
}

function SpendKpi({ c, month, account }: { c: Computed; month: string; account: string }) {
  const vs = c.prev.total ? c.cur.total / c.prev.total - 1 : null;
  const reimb = sum(c.cur.reimb);
  const off = [...c.excludedAcc].map((id) => c.accById.get(id)).filter((a) => a != null);
  const notes = [reimb ? `${brl(reimb)} reembolsados nos grupos` : '', account === 'all' && off.length ? `sem ${off.map((a) => a.name).join(', ')}` : ''].filter(Boolean);
  return (
    <Styled.Kpi>
      <Styled.Top>Gastos em {fmtMonthName(month)}<Styled.Ico><Icon d={ICON.up} /></Styled.Ico></Styled.Top>
      <Styled.Value>{brl(c.cur.total)}</Styled.Value>
      <Styled.Meta>
        {vs != null
          ? <><Chip $tone={vs > 0 ? 'warn' : 'pos'}>{vs > 0 ? '▲ +' : '▼ −'}{num(Math.abs(vs) * 100, 1)}%</Chip><span>vs {fmtMonthName(c.prevMonth)}</span></>
          : <span>{plural(c.cur.out.length, 'transação', 'transações')}</span>}
      </Styled.Meta>
      {notes.length > 0 && <Styled.Meta as="span">{notes.join(' · ')}</Styled.Meta>}
    </Styled.Kpi>
  );
}

// New money put into investments this month (applications − redemptions, so moving money from one
// investment to another counts as zero), against the monthly contribution goal.
function InvestKpi({ c, goals, month }: { c: Computed; goals: Goals; month: string }) {
  const applied = sum(c.cur.investOut);
  const redeemed = sum(c.cur.investIn);
  const net = applied - redeemed;
  const goal = goals.monthlyContribution;
  const r = goal ? Math.max(net, 0) / goal : null;
  return (
    <Styled.Kpi>
      <Styled.Top>Investido em {fmtMonthName(month)}<Styled.Ico><Icon d={ICON.investimentos} /></Styled.Ico></Styled.Top>
      <Styled.Value $tone={net < 0 ? 'neg' : undefined}>{net < 0 ? '−' : ''}{brl(Math.abs(net))}</Styled.Value>
      {r != null && (
        <Styled.Progress>
          <Bar><BarFill $value={r} $color={r >= 1 ? '--pos' : '--c-rf'} /></Bar>
          <Styled.Meta as="span">{brl0(Math.max(net, 0))} de {brl0(goal)} da meta de aporte · {Math.round(r * 100)}%</Styled.Meta>
        </Styled.Progress>
      )}
      <Styled.Meta>
        {c.cur.investOut.length || c.cur.investIn.length
          ? <>
            <span>{brl(applied)} aplicados{redeemed ? ` − ${brl(redeemed)} resgatados` : ''}</span>
            {net < 0 && <span>resgatou mais do que aplicou</span>}
            {c.renda > 0 && net > 0 && <Chip $tone="accent">{num((net / c.renda) * 100, 1)}% da renda</Chip>}
          </>
          : <span>Nenhuma aplicação no mês{goal ? '' : <> · defina uma meta de aporte em <a href="#/configuracoes">Configurações</a></>}</span>}
      </Styled.Meta>
    </Styled.Kpi>
  );
}

// Saldo (income − spending, with how the income split up) and the budget, side by side.
function BalanceKpi({ s, c, month }: { s: SpendingData; c: Computed; month: string }) {
  const { renda } = c;
  const balance = renda - c.cur.total;
  const free = renda - c.cur.total - c.investedNet;
  // Scaled to what went out when that passes the income, so the bar never overflows.
  const base = Math.max(renda, c.cur.total + c.investedNet);
  const parts = ([
    ['Gastos', Math.max(c.cur.total, 0), free < 0 ? '--neg' : '--accent'],
    ['Investido', c.investedNet, '--c-rf'],
    ['Sobra', Math.max(free, 0), '--pos'],
  ] as const).filter(([, v]) => v > 0);
  const share = (v: number) => `${num((v / renda) * 100, 0)}%`;
  const setIncome = <a href="#/configuracoes">defina sua renda</a>;
  const received = s.monthlyIncome
    ? `${brl(c.incomeTotal)} recebidos de ${brl(s.monthlyIncome)} previstos`
    : c.incomeTotal ? <>{brl(c.incomeTotal)} recebidos · {setIncome}</> : <>Nenhuma entrada no mês · {setIncome}</>;

  const limit = budgetLimit(s);
  let budget;
  if (limit) {
    const r = c.cur.total / limit.value, st = status(r);
    const left = limit.value - c.cur.total;
    const isCurrent = month === todayIso().slice(0, 7);
    const daysLeft = daysInMonth(month) - Number(todayIso().slice(8, 10)) + 1;
    budget = <>
      <Styled.PartLabel>Orçamento<Chip $tone={st.tone}>{st.label}</Chip></Styled.PartLabel>
      <Styled.Value $size="part">{Math.round(r * 100)}% usado</Styled.Value>
      <Bar><BarFill $value={r} $color={st.color} /></Bar>
      <Styled.Meta as="span">{brl(c.cur.total)} de {brl(limit.value)} · {limit.source}</Styled.Meta>
      {left < 0 ? <Styled.Meta as="span" $neg>{brl(-left)} acima do limite</Styled.Meta>
        : isCurrent ? <Styled.Meta as="span">Restam {brl(left)} · {brl(left / daysLeft)} por dia até o fim do mês</Styled.Meta> : null}
    </>;
  } else {
    budget = <>
      <Styled.PartLabel>Orçamento</Styled.PartLabel>
      <Styled.Value $size="sm">Sem orçamento</Styled.Value>
      <Styled.Meta as="span">Defina sua renda, um limite geral ou limites por categoria em <a href="#/configuracoes">Configurações</a>.</Styled.Meta>
    </>;
  }

  return (
    <Styled.Kpi $wide>
      <Styled.Top>Saldo e orçamento<Styled.Ico><Icon d={ICON.coin} /></Styled.Ico></Styled.Top>
      <Styled.Split>
        <Styled.Part>
          <Styled.PartLabel>
            Saldo do mês
            {renda ? <Chip $tone={balance >= 0 ? 'pos' : 'neg'}>{num((Math.abs(balance) / renda) * 100, 1)}% {balance >= 0 ? 'da renda guardada' : 'acima da renda'}</Chip> : null}
          </Styled.PartLabel>
          <Styled.Value $size="part" $tone={balance >= 0 ? 'pos' : 'neg'}>{balance >= 0 ? '+' : '−'}{brl(Math.abs(balance))}</Styled.Value>
          {renda > 0 && parts.length > 0 && <>
            <SplitBar $size="sm" role="img" aria-label={parts.map(([l, v]) => `${l}: ${brl(v)}`).join(', ')}>
              {parts.map(([l, v, color]) => <div key={l} title={`${l}: ${brl(v)}`} style={{ width: `${(v / base) * 100}%`, background: `var(${color})` }} />)}
            </SplitBar>
            <Legend $size="sm">
              {parts.map(([l, v, color]) => <span key={l}><Swatch $kind="round" $color={color} />{l} {share(v)}</span>)}
              {free < 0 && <Toned $tone="neg">Faltaram {brl(-free)}</Toned>}
            </Legend>
          </>}
          <Styled.Meta as="span">{received}</Styled.Meta>
        </Styled.Part>
        <Styled.Part>{budget}</Styled.Part>
      </Styled.Split>
    </Styled.Kpi>
  );
}
