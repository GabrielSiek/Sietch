import { useState, type FormEvent } from 'react';
import type { CategoryKey, Settings } from '@shared/types';
import { segmentsOf } from '@shared/segments';
import { api, errorMessage } from '@/lib/api';
import { ASSET_CLASSES, CATEGORIES, segmentColor } from '@/lib/categories';
import { num } from '@/lib/format';
import { setSettings, showError, toast, useStore } from '@/store';
import { Button, Field, FormActions, FormGrid, Input, InputAffix, Muted, Saved, Suffix, Swatch } from '@/components/ui';
import { CardHeader } from '@/components/CardHeader';
import { MoneyField } from '../MoneyField';
import { fieldValue, parseNum } from '../../helpers';
import * as Styled from './styles';

export function GoalsForm() {
  const g = useStore((s) => s.settings.goals);
  const [monthly, setMonthly] = useState(() => fieldValue(g.monthlyContribution));
  const [target, setTarget] = useState(() => fieldValue(g.wealthTarget));
  const [date, setDate] = useState(g.wealthDate ?? '');
  const [rate, setRate] = useState(() => num(g.monthlyRate ?? 0.9));
  const [alloc, setAlloc] = useState<Partial<Record<CategoryKey, string>>>(() =>
    Object.fromEntries(ASSET_CLASSES.map((k) => [k, g.allocation?.[k] ? num(g.allocation[k]) : ''])));
  // Per class and segment, keyed "FII:TIJOLO" ("ACOES:" for classes that aren't split).
  const [segAlloc, setSegAlloc] = useState<Record<string, string>>(() => Object.fromEntries(
    Object.entries(g.segmentAllocation ?? {}).flatMap(([k, segs]) => Object.entries(segs).map(([s, v]) => [`${k}:${s}`, num(v)]))));
  const [goTo, setGoTo] = useState<Record<string, string>>(() => Object.fromEntries(
    Object.entries(g.goTo ?? {}).flatMap(([k, segs]) => Object.entries(segs).map(([s, list]) => [`${k}:${s}`, list.join(', ')]))));
  const [saved, setSaved] = useState(false);
  const planned = ASSET_CLASSES.filter((k) => (parseNum(alloc[k]) || 0) > 0);
  const partsOf = (k: CategoryKey) => Object.keys(segmentsOf(k) ?? { '': '' });

  const total = ASSET_CLASSES.reduce((s, k) => s + (parseNum(alloc[k]) || 0), 0);
  const off = Math.abs(total - 100) > 0.05;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const allocation = Object.fromEntries(ASSET_CLASSES.map((k) => [k, parseNum(alloc[k])]).filter(([, v]) => v));
    const segmentAllocation = Object.fromEntries(ASSET_CLASSES.filter((k) => segmentsOf(k))
      .map((k) => [k, Object.fromEntries(partsOf(k).map((s) => [s, parseNum(segAlloc[`${k}:${s}`])]).filter(([, v]) => v))]));
    const goToLists = Object.fromEntries(ASSET_CLASSES.map((k) => [k, Object.fromEntries(partsOf(k)
      .map((s) => [s, (goTo[`${k}:${s}`] ?? '').split(/[,;]/).map((x) => x.trim()).filter(Boolean)]))]));
    const goals = {
      monthlyContribution: parseNum(monthly), wealthTarget: parseNum(target),
      wealthDate: date || null, monthlyRate: parseNum(rate), allocation, segmentAllocation, goTo: goToLists,
    };
    const segNums = Object.values(segmentAllocation).flatMap((x) => Object.values(x));
    if ([...Object.values(goals), ...segNums].some((v) => Number.isNaN(v))) { showError('Confira os valores: use apenas números.'); return; }
    try {
      setSettings(await api.put<Settings>('/settings', { goals }));
      showError('');
      setSaved(true);
      toast('Metas salvas');
    } catch (err) { showError(errorMessage(err)); }
  };

  return (
    <Styled.Container as="form" onSubmit={save}>
      <CardHeader title="Metas de investimento" sub="Usadas na seção Metas da página Investimentos" />
      <FormGrid>
        <MoneyField id="g-monthly" label="Aporte mensal" value={monthly} onChange={setMonthly} hint="Quanto você quer investir por mês" />
        <MoneyField id="g-target" label="Meta de patrimônio" value={target} onChange={setTarget} />
        <Field>
          <label htmlFor="g-date">Prazo da meta</label>
          <Input type="month" id="g-date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field>
          <label htmlFor="g-rate">Rendimento esperado</label>
          <InputAffix><Input $suf id="g-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /><Suffix>% a.m.</Suffix></InputAffix>
          <small>Usado para estimar o aporte necessário</small>
        </Field>
      </FormGrid>
      <Field>
        <label>Alocação alvo</label>
        <small>
          Percentual desejado de cada classe na carteira.{' '}
          <Styled.Sum $warn={Boolean(total) && off}>{total ? `Soma atual: ${num(total, 1)}%${off ? ' (o ideal é 100%)' : ' ✓'}` : ''}</Styled.Sum>
        </small>
      </Field>
      <Styled.AllocGrid>
        {ASSET_CLASSES.map((k) => (
          <Field key={k}>
            <Styled.ClassLabel htmlFor={`a-${k}`}><Swatch as="span" $color={CATEGORIES[k].color} />{CATEGORIES[k].label}</Styled.ClassLabel>
            <InputAffix>
              <Input $suf id={`a-${k}`} inputMode="decimal" value={alloc[k] ?? ''} placeholder="0" onChange={(e) => setAlloc((a) => ({ ...a, [k]: e.target.value }))} />
              <Suffix>%</Suffix>
            </InputAffix>
          </Field>
        ))}
      </Styled.AllocGrid>
      <Field>
        <label>Dentro de cada classe</label>
        <small>
          Como dividir cada classe entre os segmentos e quais ativos você compraria em seguida (até 3, separados por vírgula).
          Usados na sugestão “Onde aportar”; sem ativos escolhidos, ela sugere reforçar sua menor posição.
        </small>
      </Field>
      {planned.length
        ? planned.map((k) => {
          const segs = segmentsOf(k);
          const sum = partsOf(k).reduce((acc, s) => acc + (parseNum(segAlloc[`${k}:${s}`]) || 0), 0);
          return (
            <Styled.ClassBlock key={k}>
              <Styled.BlockHead>
                <Swatch as="span" $color={CATEGORIES[k].color} /><b>{CATEGORIES[k].label}</b>
                {segs && sum > 0 && <Styled.Sum $warn={Math.abs(sum - 100) > 0.05}>{num(sum, 1)}%{Math.abs(sum - 100) > 0.05 ? ' (o ideal é 100%)' : ' ✓'}</Styled.Sum>}
              </Styled.BlockHead>
              {partsOf(k).map((s) => {
                const id = `${k}:${s}`;
                const label = segs ? segs[s] : 'Ativos preferidos';
                return (
                  <Styled.SegRow key={s} $split={Boolean(segs)}>
                    <Styled.ClassLabel htmlFor={`go-${id}`}>{segs && <Swatch as="span" $color={segmentColor(s)} />}{label}</Styled.ClassLabel>
                    {segs && (
                      <InputAffix>
                        <Input $suf inputMode="decimal" aria-label={`${label}: % de ${CATEGORIES[k].label}`} placeholder="0" value={segAlloc[id] ?? ''}
                          onChange={(e) => setSegAlloc((a) => ({ ...a, [id]: e.target.value }))} />
                        <Suffix>%</Suffix>
                      </InputAffix>
                    )}
                    <Input id={`go-${id}`} placeholder="Tickers ou nomes, separados por vírgula" value={goTo[id] ?? ''}
                      onChange={(e) => setGoTo((a) => ({ ...a, [id]: e.target.value }))} />
                  </Styled.SegRow>
                );
              })}
            </Styled.ClassBlock>
          );
        })
        : <Muted as="small">Defina a alocação alvo de uma classe acima para escolher seus segmentos e ativos preferidos.</Muted>}
      <FormActions>
        {saved && <Saved>Metas salvas</Saved>}
        <Button $variant="primary" type="submit">Salvar metas</Button>
      </FormActions>
    </Styled.Container>
  );
}
