// ---------- Settings (goals, budgets, transaction category rules) ----------

import type { CategoryKey, Goals, Group, Settings } from '../shared/types.ts';
import { isSegmentOf, segmentsOf } from '../shared/segments.ts';
import { HttpError } from './http-error.ts';
import { CATEGORY_KEYS } from './portfolio.ts';
import { SETTINGS_FILE, readJsonFile } from './storage.ts';

const DEFAULT_GOALS: Goals = {
  monthlyContribution: null, wealthTarget: null, wealthDate: null, monthlyRate: 0.9, allocation: {}, segmentAllocation: {}, goTo: {},
};

export async function loadSettings(): Promise<Settings> {
  const s = await readJsonFile<Partial<Settings>>(SETTINGS_FILE, {});
  return {
    goals: { ...DEFAULT_GOALS, ...s.goals },
    budgets: s.budgets ?? {},
    budgetTotal: s.budgetTotal ?? null, // general monthly spending limit, on top of the per-category ones
    monthlyIncome: s.monthlyIncome ?? null, // what you expect to receive each month (overrides detected income)
    txRules: s.txRules ?? {},
    groups: s.groups ?? [], // [{ id, name, icon, patterns: [] }]
    txGroups: s.txGroups ?? {}, // { [transactionId]: groupId | 'none' } manual assignments
    excludedAccounts: s.excludedAccounts ?? [], // account ids shown but left out of totals
  };
}

const GROUP_ICONS = ['investimentos', 'basquete', 'futebol', 'cinema', 'trabalho', 'casa', 'viagem', 'pets', 'saude', 'lazer', 'compras', 'alimentacao', 'transporte', 'educacao', 'outros'];

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'grupo';

/** A group as sent by the browser, before validation. */
export interface GroupInput {
  id?: unknown;
  name?: unknown;
  icon?: unknown;
  patterns?: unknown;
  categories?: unknown;
  excludeFromTotals?: unknown;
  income?: unknown;
}

export function cleanGroups(list: unknown = []): Group[] {
  if (!Array.isArray(list) || list.length > 50) throw new HttpError(400, 'groups must be a list (max 50).');
  const seen = new Set<string>();
  return (list as GroupInput[]).map((g) => {
    const name = String(g.name ?? '').trim().slice(0, 40);
    if (!name) throw new HttpError(400, 'Every group needs a name.');
    let id = typeof g.id === 'string' && /^[a-z0-9-]{1,40}$/.test(g.id) ? g.id : slug(name);
    while (seen.has(id)) id = `${id}-2`;
    seen.add(id);
    const patterns = [...new Set((Array.isArray(g.patterns) ? g.patterns : String(g.patterns ?? '').split(/[\n,;]/))
      .map((p) => String(p).trim().slice(0, 60)).filter(Boolean))].slice(0, 100);
    const categories = [...new Set((Array.isArray(g.categories) ? g.categories : []).map(String).filter((c) => /^[\w-]{1,40}$/.test(c)))].slice(0, 50);
    // excludeFromTotals: the group shows its own totals but stays out of "Gastos", "Saldo" and the budget.
    // income: money received in the group counts as Receitas (e.g. Salário) instead of a reimbursement.
    const icon = typeof g.icon === 'string' && GROUP_ICONS.includes(g.icon) ? g.icon : 'outros';
    return { id, name, icon, patterns, categories, excludeFromTotals: Boolean(g.excludeFromTotals), income: Boolean(g.income) };
  });
}

const positiveOrNull = (v: unknown): number | null | undefined => (v == null || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);

export function cleanGoals(g: Record<string, unknown> = {}): Goals {
  const goals: Goals = { ...DEFAULT_GOALS };
  const amount = (k: 'monthlyContribution' | 'wealthTarget' | 'monthlyRate') => {
    const v = positiveOrNull(g[k]);
    if (v === undefined) throw new HttpError(400, `${k} must be a positive number.`);
    return v;
  };
  goals.monthlyContribution = amount('monthlyContribution') ?? DEFAULT_GOALS.monthlyContribution;
  goals.wealthTarget = amount('wealthTarget') ?? DEFAULT_GOALS.wealthTarget;
  goals.monthlyRate = amount('monthlyRate') ?? DEFAULT_GOALS.monthlyRate;
  const wealthDate = g.wealthDate as string | null | undefined;
  if (wealthDate != null && wealthDate !== '' && !/^\d{4}-\d{2}(-\d{2})?$/.test(wealthDate)) throw new HttpError(400, 'wealthDate must be YYYY-MM.');
  goals.wealthDate = wealthDate || null;
  goals.allocation = {};
  for (const [k, v] of Object.entries((g.allocation ?? {}) as Record<string, unknown>)) {
    if (!CATEGORY_KEYS.includes(k as CategoryKey)) continue;
    const n = positiveOrNull(v);
    if (n === undefined || (n != null && n > 100)) throw new HttpError(400, `allocation.${k} must be between 0 and 100.`);
    if (n) goals.allocation[k as CategoryKey] = n;
  }
  goals.segmentAllocation = {};
  for (const [k, segs] of Object.entries((g.segmentAllocation ?? {}) as Record<string, Record<string, unknown>>)) {
    if (!CATEGORY_KEYS.includes(k as CategoryKey)) continue;
    const out: Record<string, number> = {};
    for (const [s, v] of Object.entries(segs ?? {})) {
      if (!isSegmentOf(k as CategoryKey, s)) continue;
      const n = positiveOrNull(v);
      if (n === undefined || (n != null && n > 100)) throw new HttpError(400, `segmentAllocation.${k}.${s} must be between 0 and 100.`);
      if (n) out[s] = n;
    }
    if (Object.keys(out).length) goals.segmentAllocation[k as CategoryKey] = out;
  }
  // Up to 3 assets per segment ('' is the whole class for classes that aren't split).
  goals.goTo = {};
  for (const [k, segs] of Object.entries((g.goTo ?? {}) as Record<string, Record<string, unknown>>)) {
    if (!CATEGORY_KEYS.includes(k as CategoryKey)) continue;
    const split = Boolean(segmentsOf(k as CategoryKey));
    const out: Record<string, string[]> = {};
    for (const [s, list] of Object.entries(segs ?? {})) {
      if (split ? !isSegmentOf(k as CategoryKey, s) : s !== '') continue;
      const names = [...new Set((Array.isArray(list) ? list : []).map((x) => String(x).trim().slice(0, 40)).filter(Boolean))].slice(0, 3);
      if (names.length) out[s] = names;
    }
    if (Object.keys(out).length) goals.goTo[k as CategoryKey] = out;
  }
  return goals;
}

export function cleanBudgets(b: Record<string, unknown> = {}): Record<string, number> {
  const budgets: Record<string, number> = {};
  for (const [k, v] of Object.entries(b)) {
    const n = positiveOrNull(v);
    if (n === undefined) throw new HttpError(400, `Budget for ${k} must be a positive number.`);
    if (n) budgets[String(k)] = n;
  }
  return budgets;
}

export function cleanAmount(v: unknown, name: string): number | null {
  const n = positiveOrNull(v);
  if (n === undefined) throw new HttpError(400, `${name} must be a positive number.`);
  return n || null;
}
