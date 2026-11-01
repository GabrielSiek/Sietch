import type { Goals } from '@shared/types';
import { ASSET_CLASSES, CATEGORIES } from '@/lib/categories';
import { brl, brl0, num, plural } from '@/lib/format';
import { ICON } from '@/lib/icons';
import { Button, Empty, Legend, Muted, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { Icon } from '@/components/Icon';
import { contributionPlan, type Derived, type PlanPick } from '../../derive';
import * as Styled from './styles';

interface Props {
  goals: Goals;
  d: Derived;
  /** Net amount contributed this month. */
  aportado: number;
}

// Meta de alocação
export function AllocationGoal({ goals: g, d, aportado }: Props) {
  const targets = g.allocation ?? {};
  return (
    <Styled.Container>
      <CardHeader title="Meta de alocação" sub="Carteira atual comparada à distribuição alvo">
        <Button as="a" $size="sm" href="#/configuracoes"><Icon d={ICON.edit} size={16} />Editar metas</Button>
      </CardHeader>
      {Object.keys(targets).length
        ? <Allocation goals={g} d={d} remaining={g.monthlyContribution ? Math.max(g.monthlyContribution - Math.max(aportado, 0), 0) : 0} />
        : (
          <Empty as="div">
            Defina o percentual que você quer em cada classe (ex.: 40% renda fixa, 25% FIIs…) para comparar com a carteira atual.<br />
            <Button as="a" $size="sm" href="#/configuracoes"><Icon d={ICON.plus} size={16} />Definir alocação alvo</Button>
          </Empty>
        )}
    </Styled.Container>
  );
}

function Allocation({ goals, d, remaining }: { goals: Goals; d: Derived; remaining: number }) {
  const targets = goals.allocation;
  const keys = ASSET_CLASSES.filter((k) => targets[k] || d.classes[k].value > 0);
  const curOf = (k: (typeof keys)[number]) => (d.total ? (d.classes[k].value / d.total) * 100 : 0);
  const scale = Math.max(40, Math.ceil(Math.max(...keys.map((k) => Math.max(curOf(k), targets[k] ?? 0))) / 10) * 10);

  const plan = contributionPlan(d, goals, remaining);
  const suggest = plan.length > 0 && (
    <Styled.Suggest>
      <div>
        <Styled.SuggestTitle>Onde aportar os {brl(remaining)} que faltam</Styled.SuggestTitle><br />
        <small>Sugestão para aproximar a carteira do alvo sem vender nada · ativos preferidos em <a href="#/configuracoes">Configurações</a></small>
      </div>
      <Styled.Items>
        {plan.map((x) => (
          <Styled.Item key={x.key}>
            <Styled.ItemHead>
              <Swatch as="span" $color={CATEGORIES[x.key].color} />
              <Styled.ItemLabel>{CATEGORIES[x.key].label}</Styled.ItemLabel>
              <b>{brl(x.amount)}</b>
            </Styled.ItemHead>
            {x.segments.map((sg) => (
              <Styled.SegLine key={sg.segment ?? ''}>
                {sg.segment && (
                  <Styled.SegName><Swatch as="span" $color={sg.color} />{sg.label}<Muted>{brl(sg.amount)}</Muted></Styled.SegName>
                )}
                <Styled.Picks>
                  {sg.picks.length
                    ? sg.picks.map((pk) => <Pick key={pk.name} pick={pk} amount={sg.amount / sg.picks.length} />)
                    : <Muted as="small">Defina ativos preferidos em Configurações</Muted>}
                </Styled.Picks>
              </Styled.SegLine>
            ))}
          </Styled.Item>
        ))}
      </Styled.Items>
    </Styled.Suggest>
  );

  return (
    <>
      <Legend>
        <span><Styled.CurrentKey />Atual</span>
        <span><Styled.TargetKey />Alvo</span>
        <span><Swatch $kind="round" $color="--pos" />até 2 p.p.</span>
        <span><Swatch $kind="round" $color="--warn" />2 a 5 p.p.</span>
        <span><Swatch $kind="round" $color="--neg" />acima de 5 p.p.</span>
      </Legend>
      <div>
        {keys.map((k) => {
          const cur = curOf(k), tg = targets[k] ?? 0, diff = cur - tg, ad = Math.abs(diff);
          const kind = ad <= 2 ? 'pos' : ad <= 5 ? 'warn' : 'neg';
          return (
            <Styled.AllocRow key={k}>
              <Styled.Label>
                <b><Swatch as="span" $color={CATEGORIES[k].color} />{CATEGORIES[k].label}</b>
                <small>{brl0(d.classes[k].value)} · alvo {brl0((tg / 100) * d.total)}</small>
              </Styled.Label>
              <Styled.Track>
                <Styled.Current style={{ width: `${Math.min(cur / scale, 1) * 100}%`, background: `var(${CATEGORIES[k].color})` }} />
                <Styled.Target style={{ left: `${(tg / scale) * 100}%` }} />
              </Styled.Track>
              <Styled.Nums><b>{num(cur, 1)}%</b><Muted> / {num(tg, 1)}%</Muted></Styled.Nums>
              <Styled.GapChip $tone={kind}>{ad <= 2 ? 'No alvo' : `${diff > 0 ? '+' : '−'}${num(ad, 1)} p.p.`}</Styled.GapChip>
            </Styled.AllocRow>
          );
        })}
      </div>
      {suggest}
    </>
  );
}

/** A go-to asset, with how many shares the amount buys when its quote is known. */
function Pick({ pick, amount }: { pick: PlanPick; amount: number }) {
  const shares = pick.price ? Math.floor(amount / pick.price) : null;
  const hint = pick.fallback ? 'Sua menor posição aqui — escolha ativos preferidos em Configurações' : undefined;
  return (
    <Styled.PickChip title={hint}>
      <b>{pick.name}</b>
      {shares != null && <Muted>{shares >= 1 ? `≈ ${plural(shares, 'cota', 'cotas')}` : `cota ${brl(pick.price!)}`}</Muted>}
      {pick.fallback && <Muted>reforço</Muted>}
    </Styled.PickChip>
  );
}
