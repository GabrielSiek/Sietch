// Investimentos: data derived from the portfolio (holdings, class totals, series, table rows).
import type { Account, CategoryKey, CategorySource, Contribution, Goals, Investment, Portfolio } from '@shared/types';
import { segmentsOf } from '@shared/segments';
import { ASSET_CLASSES, CATEGORIES, CLASS_KEYS, GROUP_COLORS, cat, segmentColor, segmentLabel, subtypeLabel, type ClassKey, type ColorVar } from '@/lib/categories';
import { addDays, addMonths, fmtMonthYear, num, plural, todayIso } from '@/lib/format';

export const PERIODS: [label: string, days: number, word: string][] = [['1M', 30, 'no mês'], ['6M', 180, 'em 6 meses'], ['1A', 365, 'em 12 meses'], ['Tudo', 0, 'desde o início']];

export type ClassFilter = 'ALL' | CategoryKey;

export interface Holding extends Investment {
  cost: number | null;
  rateLabel: string;
  returnPct: number | null;
  avgPrice: number | null;
  title: string;
  sub: string;
  short: string;
  share: number;
}

export interface ClassSummary {
  key: ClassKey;
  value: number;
  count: number;
  profit: number;
  cost: number;
  /** Money put in (cost, or the balance when unknown). */
  invested: number;
  income12m: number;
  monthW: number;
  monthV: number;
  subtypes: Record<string, number>;
  /** Balance per segment ('' for assets without one); empty for classes that aren't split. */
  segments: Record<string, number>;
}

export interface Derived {
  investments: Holding[];
  accounts: Account[];
  cash: number;
  total: number;
  profit: number;
  cost: number;
  invested: number;
  income12m: number;
  classes: Record<ClassKey, ClassSummary>;
}

// ---------- Derived data ----------

function rateLabel(i: Investment) {
  const parts: string[] = [];
  if (i.rate != null && i.rateType) parts.push(i.rateType === 'CDI' ? `${num(i.rate)}% do CDI` : i.rate === 100 ? i.rateType : `${num(i.rate)}% ${i.rateType}`);
  if (i.fixedAnnualRate) parts.push(`${num(i.fixedAnnualRate)}% a.a.`);
  return parts.join(' + ');
}

// "CDB - NU FINANCEIRA S.A. - SOCIEDADE DE CREDITO..." → "Nu Financeira"
export function shortIssuer(i: Investment) {
  let s = i.issuer || i.name.split(' - ').slice(1).join(' - ') || i.name;
  s = s.split(/ - |,| S\.?\/?A\.?\b/i)[0].trim();
  return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_m, sp: string, c: string) => sp + c.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (w) => w.toLowerCase());
}

function describe(i: Investment & { rateLabel: string }) {
  if (i.category === 'RENDA_FIXA') {
    const kind = i.subtype === 'TREASURY' ? 'Tesouro' : subtypeLabel(i.subtype) || 'Renda fixa';
    const title = i.subtype === 'TREASURY' ? i.name.replace(/^Tesouro\s*/i, 'Tesouro ') : `${kind} ${shortIssuer(i)}`;
    const sub = [i.rateLabel, i.dueDate ? `vence ${fmtMonthYear(i.dueDate)}` : null].filter(Boolean).join(' · ');
    return { title, sub: sub || shortIssuer(i), short: i.subtype === 'TREASURY' ? 'TD' : (i.subtype || 'RF').slice(0, 4) };
  }
  const ticker = i.code || (/^[A-Z0-9]{4,6}$/.test(i.name) ? i.name : null);
  if (ticker) return { title: ticker, sub: i.name !== ticker ? i.name : subtypeLabel(i.subtype), short: ticker.slice(0, 4) };
  return { title: i.name, sub: subtypeLabel(i.subtype) || i.institution, short: cat(i.category).short };
}

export function derive(p: Portfolio): Derived {
  const list = p.connections.flatMap((c) => c.investments).map((i) => {
    const cost = i.amountOriginal ?? (i.amountProfit != null ? i.balance - i.amountProfit : null);
    const x = { ...i, cost, rateLabel: rateLabel(i), returnPct: i.amountProfit != null && cost != null && cost > 0 ? i.amountProfit / cost : null };
    const avgPrice = x.quantity && cost != null && x.category !== 'RENDA_FIXA' ? cost / x.quantity : null;
    return { ...x, avgPrice, ...describe(x) };
  });
  const accounts = p.connections.flatMap((c) => c.accounts);
  const cash = accounts.filter((a) => a.type === 'BANK').reduce((s, a) => s + a.balance, 0);
  const total = list.reduce((s, i) => s + i.balance, 0);
  const investments: Holding[] = list.map((i) => ({ ...i, share: total ? i.balance / total : 0 }));
  const withCost = investments.filter((i) => i.returnPct != null);
  const profit = withCost.reduce((s, i) => s + (i.amountProfit ?? 0), 0);
  const cost = withCost.reduce((s, i) => s + (i.cost ?? 0), 0);
  const invested = investments.reduce((s, i) => s + (i.cost ?? i.balance), 0);
  const yearAgo = addDays(todayIso(), -365);
  const income12m = p.income.filter((e) => e.date >= yearAgo).reduce((s, e) => s + e.amount, 0);

  const classes = Object.fromEntries(CLASS_KEYS.map((key) => [key, { key, value: 0, count: 0, profit: 0, cost: 0, invested: 0, income12m: 0, monthW: 0, monthV: 0, subtypes: {}, segments: {} }])) as Record<ClassKey, ClassSummary>;
  for (const i of investments) {
    const c = classes[i.category] ?? classes.OUTROS;
    c.value += i.balance;
    c.count += 1;
    c.invested += i.cost ?? i.balance;
    if (segmentsOf(i.category)) c.segments[i.segment ?? ''] = (c.segments[i.segment ?? ''] ?? 0) + i.balance;
    if (i.returnPct != null) { c.profit += i.amountProfit ?? 0; c.cost += i.cost ?? 0; }
    if (i.lastMonthRate != null) { c.monthW += i.balance; c.monthV += i.balance * i.lastMonthRate; }
    const st = i.category === 'FII' ? 'REAL_ESTATE_FUND' : i.subtype;
    if (st) c.subtypes[st] = (c.subtypes[st] ?? 0) + i.balance;
  }
  for (const e of p.income) if (e.date >= yearAgo) (classes[e.category] ?? classes.OUTROS).income12m += e.amount;
  return { investments, accounts, cash, total, profit, cost, invested, income12m, classes };
}

/** The wallet (or one class of it) over time: what it was worth each day and the money put in. */
export function growthSeries(p: Portfolio, d: Derived, days: number, filter: ClassFilter = 'ALL') {
  const today = todayIso();
  const contrib = new Map<string, number>();
  for (const c of p.contributions) if (filter === 'ALL' || c.category === filter) contrib.set(c.date, (contrib.get(c.date) ?? 0) + c.delta);
  const values = new Map(p.history.map((h) => [h.date, filter === 'ALL' ? h.invested : h.byCategory?.[filter] ?? 0]));
  values.set(today, filter === 'ALL' ? d.total : d.classes[filter].value);
  const first = [...contrib.keys(), ...values.keys()].sort()[0] ?? today;
  const start = days ? [first, addDays(today, -days)].sort()[1] : first;
  const labels: string[] = [], applied: number[] = [], value: (number | null)[] = [];
  let cum = 0;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    cum += contrib.get(day) ?? 0;
    if (day < start) continue;
    labels.push(day);
    applied.push(Math.max(cum, 0));
    value.push(values.get(day) ?? null);
  }
  return { labels, applied, value };
}

export interface DonutRow { key: string; label: string; value: number; color: ColorVar }

/** The wallet by class, or one class by segment (by subtype for classes that aren't split). */
export function donutRows(d: Derived, filter: ClassFilter = 'ALL'): DonutRow[] {
  if (filter === 'ALL') {
    return ASSET_CLASSES.filter((k) => d.classes[k].value > 0)
      .map((k) => ({ key: k, label: CATEGORIES[k].label, value: d.classes[k].value, color: CATEGORIES[k].color }));
  }
  const c = d.classes[filter];
  const split = Boolean(segmentsOf(filter));
  const rows: DonutRow[] = Object.entries(split ? c.segments : c.subtypes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    .map(([k, value], idx) => split
      ? { key: k, label: segmentLabel(filter, k || null), value, color: segmentColor(k || null) }
      : { key: k, label: subtypeLabel(k), value, color: GROUP_COLORS[idx % GROUP_COLORS.length] });
  // Assets with no subtype reported.
  const rest = c.value - rows.reduce((s, r) => s + r.value, 0);
  if (rest > 0.005) rows.push({ key: '', label: 'Outros', value: rest, color: '--c-outros' });
  return rows;
}

// ---------- Goals ----------

const monthKey = (iso: string) => iso.slice(0, 7);

/** This month's contributions: the dated ones, what went in, and the net amount. */
export function monthContributions(p: Portfolio) {
  const thisMonth = todayIso().slice(0, 7);
  const dated: Contribution[] = p.contributions.filter((c) => !c.estimated);
  const monthAportes = dated.filter((c) => monthKey(c.date) === thisMonth && c.delta > 0).sort((a, b) => b.date.localeCompare(a.date));
  const aportado = dated.filter((c) => monthKey(c.date) === thisMonth).reduce((s, c) => s + c.delta, 0);
  const netOf = (m: string) => dated.filter((c) => monthKey(c.date) === m).reduce((s, c) => s + c.delta, 0);
  return { thisMonth, monthAportes, aportado, netOf };
}

// ---------- Where to invest next ----------

export interface PlanPick {
  name: string;
  /** Last quote, when you hold it (to estimate how many shares fit). */
  price: number | null;
  /** Not one of your go-tos: your smallest position there, suggested as a top-up. */
  fallback: boolean;
}
export interface PlanSegment { segment: string | null; label: string; color: ColorVar; amount: number; picks: PlanPick[] }
export interface PlanClass { key: CategoryKey; amount: number; segments: PlanSegment[] }

/** Splits money among parts by how far each is below its target, biggest gap first. */
function byGap<K extends string>(parts: { key: K; gap: number }[], amount: number) {
  const open = parts.filter((x) => x.gap > 0.005);
  const sum = open.reduce((s, x) => s + x.gap, 0);
  return sum > 0 ? open.sort((a, b) => b.gap - a.gap).map((x) => ({ key: x.key, amount: (amount * x.gap) / sum })) : [];
}

function picksFor(d: Derived, g: Goals, k: CategoryKey, segment: string | null): PlanPick[] {
  const lists = g.goTo?.[k] ?? {};
  // segment null: the whole of a split class (no segment targets), so any of its go-tos.
  const names = [...new Set(segment == null ? Object.values(lists).flat() : lists[segment] ?? [])].slice(0, 3);
  const priced = (i: Holding | undefined) => (i && i.category !== 'RENDA_FIXA' ? i.value : null);
  if (names.length) {
    return names.map((name) => {
      const held = d.investments.find((i) => (i.code ?? i.title).toUpperCase() === name.toUpperCase());
      return { name, price: priced(held), fallback: false };
    });
  }
  // No go-to set: top up the smallest position you already have there.
  const smallest = d.investments
    .filter((i) => i.category === k && i.balance > 0 && (!segment || i.segment === segment))
    .sort((a, b) => a.balance - b.balance)[0];
  return smallest ? [{ name: smallest.title, price: priced(smallest), fallback: true }] : [];
}

/**
 * Where the rest of this month's contribution should go to bring the wallet closer to its targets without selling:
 * by class, then by segment (when the class has segment targets), naming your go-to assets.
 */
export function contributionPlan(d: Derived, g: Goals, remaining: number): PlanClass[] {
  if (remaining <= 0) return [];
  const targets = g.allocation ?? {};
  const newTotal = d.total + remaining;
  const classes = byGap(ASSET_CLASSES.map((k) => ({ key: k, gap: ((targets[k] ?? 0) / 100) * newTotal - d.classes[k].value })), remaining);
  return classes.map(({ key: k, amount }) => {
    const c = d.classes[k];
    const segs = segmentsOf(k);
    const tg = g.segmentAllocation?.[k] ?? {};
    const newValue = c.value + amount;
    const split = segs ? byGap(Object.keys(segs).map((s) => ({ key: s, gap: ((tg[s] ?? 0) / 100) * newValue - (c.segments[s] ?? 0) })), amount) : [];
    const segments: PlanSegment[] = split.length
      ? split.map((x) => ({ segment: x.key, label: segmentLabel(k, x.key), color: segmentColor(x.key), amount: x.amount, picks: picksFor(d, g, k, x.key) }))
      : [{ segment: null, label: CATEGORIES[k].label, color: CATEGORIES[k].color, amount, picks: picksFor(d, g, k, segs ? null : '') }];
    return { key: k, amount, segments };
  });
}

// ---------- Income ----------

export function incomeData(p: Portfolio) {
  const months = Array.from({ length: 12 }, (_, k) => addMonths(todayIso().slice(0, 7), k - 11));
  const byCat: Partial<Record<ClassKey, number[]>> = {};
  for (const e of p.income) {
    const idx = months.indexOf(e.date.slice(0, 7));
    if (idx < 0) continue;
    const k: ClassKey = CATEGORIES[e.category] ? e.category : 'OUTROS';
    (byCat[k] ??= new Array<number>(12).fill(0))[idx] += e.amount;
  }
  const cats = (['FII', 'ACOES', ...CLASS_KEYS.filter((k) => !['FII', 'ACOES'].includes(k))] as ClassKey[]).filter((k) => byCat[k]);
  const total = cats.reduce((s, k) => s + byCat[k]!.reduce((a, b) => a + b, 0), 0);
  return { months, byCat, cats, total };
}

// ---------- Holdings table ----------

export interface HoldingGroup {
  group: string;
  lots: Holding[];
  category: CategoryKey;
  short: string;
  currencyCode: string;
  categoryKeys: string[];
  categorySource: CategorySource;
  segment: string | null;
  segmentManual: boolean;
  title: string;
  sub: string;
  hint: string;
  cost: number | null;
  balance: number;
  amountProfit: number | null;
  share: number;
  returnPct: number | null;
  dueDate: string | null;
}

export type TableRow = Holding | HoldingGroup;
export const isGroup = (r: TableRow): r is HoldingGroup => 'lots' in r;

export type SortKey = 'title' | 'category' | 'quantity' | 'avgPrice' | 'value' | 'cost' | 'balance' | 'amountProfit' | 'share';
export interface Sort { key: SortKey; asc: boolean }

// Fixed-income lots of the same product (issuer + rate, or the same Tesouro bond) collapse into one row.
const lotKey = (i: Holding) => (i.category === 'RENDA_FIXA' ? [i.subtype, i.title, i.rateLabel].join('|') : null);

function groupRow(key: string, lots: Holding[]): HoldingGroup {
  const first = lots[0];
  const active = lots.filter((i) => i.balance > 0);
  const shown = [...(active.length ? active : lots)].sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')));
  const sumOf = (list: Holding[], f: 'cost' | 'amountProfit') => (list.some((i) => i[f] != null) ? list.reduce((s, i) => s + (i[f] ?? 0), 0) : null);
  const withReturn = lots.filter((i) => i.returnPct != null);
  const profitCost = withReturn.reduce((s, i) => s + (i.cost ?? 0), 0);
  const dues = shown.map((i) => i.dueDate).filter((x): x is string => Boolean(x));
  const range = dues.length ? (fmtMonthYear(dues[0]) === fmtMonthYear(dues.at(-1)!) ? `vence ${fmtMonthYear(dues[0])}` : `vencimentos de ${fmtMonthYear(dues[0])} a ${fmtMonthYear(dues.at(-1)!)}`) : '';
  const treasury = first.subtype === 'TREASURY';
  return {
    group: key, lots: shown, category: first.category, short: first.short, currencyCode: first.currencyCode,
    categoryKeys: lots.map((i) => i.categoryKey), categorySource: first.categorySource,
    segment: first.segment, segmentManual: first.segmentManual,
    title: treasury ? first.title : [subtypeLabel(first.subtype) || 'Renda fixa', first.rateLabel].filter(Boolean).join(' '),
    sub: [treasury ? null : shortIssuer(first), plural(shown.length, 'aplicação', 'aplicações')].filter(Boolean).join(' · '),
    hint: range,
    cost: sumOf(lots, 'cost'), balance: lots.reduce((s, i) => s + i.balance, 0), amountProfit: sumOf(lots, 'amountProfit'), share: lots.reduce((s, i) => s + i.share, 0),
    returnPct: profitCost > 0 ? withReturn.reduce((s, i) => s + (i.amountProfit ?? 0), 0) / profitCost : null,
    dueDate: dues[0] ?? null,
  };
}

function sortValue(r: TableRow, key: SortKey): number | string | null {
  if (isGroup(r)) return key === 'quantity' || key === 'avgPrice' || key === 'value' ? null : r[key];
  return r[key];
}

export function tableRows(d: Derived, filter: ClassFilter, search: string, sort: Sort) {
  const q = search.trim().toLowerCase();
  const rows = d.investments
    .filter((i) => filter === 'ALL' || i.category === filter)
    .filter((i) => !q || [i.title, i.sub, i.name, i.code, i.issuer, i.institution].some((f) => f && String(f).toLowerCase().includes(q)));
  const groups = new Map<string, Holding[]>();
  const entries: (Holding | string)[] = [];
  for (const i of rows) {
    const k = lotKey(i);
    if (!k) { entries.push(i); continue; }
    if (!groups.has(k)) { groups.set(k, []); entries.push(k); }
    groups.get(k)!.push(i);
  }
  const top: TableRow[] = entries.map((e) => (typeof e !== 'string' ? e : groups.get(e)!.length > 1 ? groupRow(e, groups.get(e)!) : groups.get(e)![0]));
  const { key, asc } = sort;
  top.sort((a, b) => {
    const av = sortValue(a, key), bv = sortValue(b, key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt-BR');
    return asc ? c : -c;
  });
  return { rows, top };
}
