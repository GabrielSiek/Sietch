// Shared app data and the actions that load it. Components read it with useStore(); actions are plain functions.
import { useSyncExternalStore } from 'react';
import type { Portfolio, Settings, SpendingData, Status, TransactionsData } from '@shared/types';
import { api, errorMessage } from './lib/api';

export interface AppState {
  status: Status | null;
  portfolio: Portfolio | null;
  settings: Settings;
  /** GET /api/spending, by month (YYYY-MM). */
  spending: Record<string, SpendingData>;
  /** GET /api/transactions, by `${from}:${to}`. Cleared together with `spending`. */
  ranges: Record<string, TransactionsData>;
  dark: boolean;
  error: string;
  toast: { id: number; message: string } | null;
}

const EMPTY_SETTINGS: Settings = {
  goals: { monthlyContribution: null, wealthTarget: null, wealthDate: null, monthlyRate: 0.9, allocation: {}, segmentAllocation: {}, goTo: {} },
  budgets: {}, budgetTotal: null, monthlyIncome: null, txRules: {}, groups: [], txGroups: {}, excludedAccounts: [],
};

let state: AppState = {
  status: null,
  portfolio: null,
  settings: EMPTY_SETTINGS,
  spending: {},
  ranges: {},
  dark: document.documentElement.classList.contains('dark'),
  error: '',
  toast: null,
};

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getState = () => state;

/** Select a slice of the state. Return existing objects, not new ones, so the component doesn't re-render forever. */
export function useStore(): AppState;
export function useStore<T>(select: (s: AppState) => T): T;
export function useStore<T>(select: (s: AppState) => T = (s) => s as T) {
  return useSyncExternalStore(subscribe, () => select(state));
}

// ---------- Messages ----------

export const showError = (message: string) => set({ error: message || '' });

let toastId = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string) {
  set({ toast: { id: ++toastId, message } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => set({ toast: null }), 2600);
}

// ---------- Data ----------

export async function reload() {
  showError('');
  try {
    const [portfolio, settings] = await Promise.all([api.get<Portfolio>('/portfolio'), api.get<Settings>('/settings')]);
    set({ portfolio, settings });
  } catch (err) {
    showError(errorMessage(err));
  }
}

export const setSettings = (settings: Settings) => set({ settings });

/** Forget every loaded month and range (groups, rules and excluded accounts apply to all of them). */
export const clearSpending = () => set({ spending: {}, ranges: {} });

/** Update fields of every loaded month and range in place, e.g. budgets just saved in Configurações. */
export function patchSpending(patch: Partial<TransactionsData>) {
  const apply = <T extends TransactionsData>(m: Record<string, T>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, ...patch }]));
  set({ spending: apply(state.spending), ranges: apply(state.ranges) });
}

const pending = new Map<string, Promise<void>>();
function once(key: string, load: () => Promise<void>) {
  if (!pending.has(key)) pending.set(key, load().catch((err) => showError(errorMessage(err))).finally(() => pending.delete(key)));
  return pending.get(key)!;
}

/** The month (YYYY-MM) and the one before it. Concurrent calls for the same month share one request. */
export const loadSpending = (month: string) => once(`month:${month}`, async () => {
  const s = await api.get<SpendingData>('/spending', { month });
  set({ spending: { ...state.spending, [month]: s } });
});

/**
 * Refetch one month after something that changes every month (groups, rules) and drop the rest.
 * The old data stays on screen until the new one arrives.
 */
export const reloadSpending = (month: string) => once(`month:${month}`, async () => {
  const s = await api.get<SpendingData>('/spending', { month });
  set({ spending: { [month]: s }, ranges: {} });
});

/** Any range of dates (YYYY-MM-DD), for the transaction filters. */
export const rangeKey = (from: string, to: string) => `${from}:${to}`;
export const loadRange = (from: string, to: string) => once(`range:${from}:${to}`, async () => {
  const r = await api.get<TransactionsData>('/transactions', { from, to });
  set({ ranges: { ...state.ranges, [rangeKey(from, to)]: r } });
});

// After connecting or syncing, Pluggy keeps collecting for a while: poll until it's done.
export async function waitForSync(ids: string[], attempts = 25) {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, i ? 4000 : 1500));
    let portfolio: Portfolio;
    try { portfolio = await api.get<Portfolio>('/portfolio'); } catch { continue; }
    set({ portfolio });
    if (!portfolio.connections.some((c) => ids.includes(c.id) && c.status === 'UPDATING')) break;
  }
  const settings = await api.get<Settings>('/settings').catch(() => state.settings);
  set({ settings, spending: {}, ranges: {} });
  toast('Dados atualizados');
}

// ---------- Theme ----------

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  set({ dark });
}

export function toggleTheme() {
  const dark = !state.dark;
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  applyTheme(dark);
}

// ---------- Boot ----------

export async function boot() {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    try { if (localStorage.getItem('theme')) return; } catch { /* ignore */ }
    applyTheme(e.matches);
  });
  let status: Status;
  try {
    status = await api.get<Status>('/status');
  } catch (err) {
    showError(errorMessage(err));
    return;
  }
  set({ status });
  if (status.configured && !status.authError) await reload();
}
