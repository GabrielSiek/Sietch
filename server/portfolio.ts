// ---------- Portfolio aggregation ----------

import type {
  Account, CategoryKey, CategorySource, Connection, Contribution, HistorySnapshot, IncomeEntry, Investment, Portfolio,
} from '../shared/types.ts';
import type { PluggyAccount, PluggyInvestment, PluggyInvestmentTx, PluggyItem } from './pluggy-types.ts';
import { pluggy, pluggyAll, mapLimit } from './pluggy.ts';
import { ETF_SEGMENTS, isAbroad, isCrypto, parseTicker, segmentOf, type SegmentOverrides } from './segments.ts';
import { HISTORY_FILE, OVERRIDES_FILE, SEGMENTS_FILE, loadItemIds, readJsonFile, writeJsonFile } from './storage.ts';

export const CATEGORY_KEYS: CategoryKey[] = ['RENDA_FIXA', 'FII', 'ACOES', 'ETF', 'EXTERIOR', 'CRIPTO', 'FUNDOS', 'PREVIDENCIA', 'OUTROS'];
const DEFAULT_SUBTYPE: Partial<Record<CategoryKey, string>> = { FII: 'REAL_ESTATE_FUND', ETF: 'ETF', ACOES: 'STOCK' };

export type Overrides = Record<string, CategoryKey>;

// Many brokers (and Open Finance via MeuPluggy) report every B3 ticker as EQUITY/STOCK,
// so ETFs, FIIs and units are told apart by ticker. "11" is shared by all three; anything
// ending in 11 that isn't a known ETF (see ETF_SEGMENTS) or unit is assumed to be a FII (by far the most common).
const KNOWN_UNITS = new Set('TAEE11 KLBN11 SANB11 BPAC11 ALUP11 ENGI11 SAPR11 IGTI11 SULA11 BRBI11 RNEW11 CPLE11'.split(' '));

function categoryFromTicker(code: string | null | undefined): { category: CategoryKey; subtype: string } | null {
  const t = parseTicker(code);
  if (!t) return null;
  const { ticker, suffix } = t;
  if (ETF_SEGMENTS.has(ticker)) return { category: 'ETF', subtype: 'ETF' };
  if (KNOWN_UNITS.has(ticker)) return { category: 'ACOES', subtype: 'UNIT' };
  if (suffix === 11) return { category: 'FII', subtype: 'REAL_ESTATE_FUND' };
  if (suffix >= 12 && suffix <= 15) return { category: 'FII', subtype: 'SUBSCRIPTION_RIGHT' };
  if (suffix === 39) return { category: 'ETF', subtype: 'BDR' };
  if (suffix >= 31 && suffix <= 35) return { category: 'ACOES', subtype: 'BDR' };
  if (suffix >= 3 && suffix <= 8) return { category: 'ACOES', subtype: 'STOCK' };
  return null;
}

const categoryKey = (inv: PluggyInvestment) => (inv.code || inv.id).toUpperCase();

interface Categorized {
  category: CategoryKey;
  subtype: string | null;
  source: CategorySource;
}

// Brazilian wallet categories. Returns the category, the effective subtype and where it came from.
function categorize(inv: PluggyInvestment, overrides: Overrides): Categorized {
  const manual = overrides[categoryKey(inv)];
  if (manual) return { category: manual, subtype: DEFAULT_SUBTYPE[manual] ?? inv.subtype ?? null, source: 'manual' };
  const c = autoCategory(inv);
  // Stocks, BDRs and ETFs invested outside Brazil get their own class, so the wallet shows how much is abroad.
  return (c.category === 'ACOES' || c.category === 'ETF') && isAbroad(inv, c.category, c.subtype) ? { ...c, category: 'EXTERIOR' } : c;
}

function autoCategory(inv: PluggyInvestment): Categorized {
  const pluggyClass = (category: CategoryKey): Categorized => ({ category, subtype: inv.subtype ?? null, source: 'pluggy' });
  switch (inv.type) {
    case 'FIXED_INCOME': return pluggyClass('RENDA_FIXA');
    case 'ETF': return pluggyClass('ETF');
    case 'MUTUAL_FUND': return pluggyClass('FUNDOS');
    case 'SECURITY': return pluggyClass('PREVIDENCIA');
    case 'EQUITY': {
      if (inv.subtype === 'REAL_ESTATE_FUND') return pluggyClass('FII');
      if (inv.subtype === 'DERIVATIVES' || inv.subtype === 'OPTION') return pluggyClass('OUTROS');
      if (/\bFII\b|imobili/i.test(inv.name ?? '')) return { category: 'FII', subtype: 'REAL_ESTATE_FUND', source: 'name' };
      const byTicker = categoryFromTicker(inv.code || inv.name);
      if (byTicker) return { ...byTicker, source: 'ticker' };
      return pluggyClass('ACOES');
    }
    default:
      // Pluggy has no crypto type; exchanges and banks report coins as OTHER, so tell them apart by name.
      if (isCrypto(inv)) return { category: 'CRIPTO', subtype: inv.subtype ?? null, source: 'name' };
      return pluggyClass('OUTROS');
  }
}

export function summarizeItem(item: PluggyItem) {
  return {
    id: item.id,
    connector: item.connector?.name ?? 'Unknown',
    connectorImage: item.connector?.imageUrl ?? null,
    isSandbox: Boolean(item.connector?.isSandbox),
    status: item.status,
    executionStatus: item.executionStatus ?? null,
    lastUpdatedAt: item.lastUpdatedAt ?? null,
    error: item.error?.message ?? null,
  };
}

// Movements only change when the item syncs, so cache them per sync.
const txCache = new Map<string, { stamp: string | null | undefined; results: PluggyInvestmentTx[] }>();

async function investmentTransactions(investmentId: string, stamp: string | null | undefined): Promise<PluggyInvestmentTx[]> {
  const hit = txCache.get(investmentId);
  if (hit && hit.stamp === stamp) return hit.results;
  let results: PluggyInvestmentTx[] = [];
  try {
    results = await pluggyAll<PluggyInvestmentTx>(`/investments/${investmentId}/transactions`);
  } catch {
    // Not every institution reports movements; treat as "no history".
  }
  txCache.set(investmentId, { stamp, results });
  return results;
}

const txAmount = (tx: PluggyInvestmentTx) => Math.abs(tx.amount ?? tx.netAmount ?? (tx.value ?? 0) * (tx.quantity ?? 0));
const txDate = (tx: PluggyInvestmentTx) => (tx.date ?? tx.tradeDate ?? '').slice(0, 10);

// Net money put into an investment (aportes − resgates) for one movement.
function contributionDelta(tx: PluggyInvestmentTx): number {
  const amt = txAmount(tx);
  switch (tx.type) {
    case 'BUY': return amt;
    case 'SELL':
    case 'AMORTIZATION': return -amt;
    case 'TRANSFER': return tx.movementType === 'CREDIT' ? amt : tx.movementType === 'DEBIT' ? -amt : 0;
    default: return 0;
  }
}

// MeuPluggy (Open Finance) items all have the same connector name, so name them after the bank instead:
// "Nu Pagamentos S.A. - Instituição de Pagamento" → "Nu Pagamentos", "itau" → "Itau".
export function institutionName(item: PluggyItem, accounts: PluggyAccount[], investments: PluggyInvestment[]): string {
  const connector = item.connector?.name ?? 'Unknown';
  if (!/meu ?pluggy/i.test(connector)) return connector;
  const raw = investments.find((i) => i.institution?.name)?.institution?.name ?? accounts.find((a) => a.type === 'BANK')?.name ?? accounts[0]?.name;
  if (!raw) return connector;
  const short = raw.split(/ - |,|\(| S\.?\/?A\.?\b/i)[0].trim();
  return short === short.toLowerCase() ? short.replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()) : short;
}

export function mapAccount(acc: PluggyAccount, connector: string): Account {
  const credit = acc.creditData;
  return {
    id: acc.id,
    itemId: acc.itemId,
    name: acc.marketingName ?? acc.name,
    number: acc.number ?? null,
    type: acc.type,
    subtype: acc.subtype ?? null,
    balance: acc.balance ?? 0,
    currencyCode: acc.currencyCode ?? 'BRL',
    connector,
    credit: credit ? {
      limit: credit.creditLimit ?? null,
      available: credit.availableCreditLimit ?? null,
      closeDate: credit.balanceCloseDate ?? null,
      dueDate: credit.balanceDueDate ?? null,
      brand: credit.brand ?? null,
      level: credit.level ?? null,
      minimumPayment: credit.minimumPayment ?? null,
    } : null,
  };
}

/** A contribution before undated ones are placed on the first known date. */
type RawContribution = Omit<Contribution, 'date' | 'estimated'> & { date: string | null; estimated?: boolean };

interface LoadedConnection extends Connection {
  income: IncomeEntry[];
  contributions: RawContribution[];
  withHistory: number;
}

async function loadConnection(id: string, overrides: Overrides, segmentOverrides: SegmentOverrides): Promise<LoadedConnection> {
  try {
    const [item, investments, accounts] = await Promise.all([
      pluggy<PluggyItem>(`/items/${id}`),
      pluggyAll<PluggyInvestment>(`/investments?itemId=${id}`),
      pluggyAll<PluggyAccount>(`/accounts?itemId=${id}`),
    ]);
    const summary = { ...summarizeItem(item), connector: institutionName(item, accounts, investments), via: item.connector?.name ?? null };
    const txs = await mapLimit(investments, 6, (inv) => investmentTransactions(inv.id, item.lastUpdatedAt));
    const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);

    const income: IncomeEntry[] = [];
    const contributions: RawContribution[] = [];
    let withHistory = 0;

    const mapped = investments.map((inv, idx): Investment => {
      const { category, subtype, source } = categorize(inv, overrides);
      const { segment, segmentManual } = segmentOf(inv, categoryKey(inv), category, subtype, segmentOverrides);
      const label = inv.code || inv.name;
      let income12m = 0;
      let hasContribution = false;
      for (const tx of txs[idx]) {
        const date = txDate(tx);
        if (!date) continue;
        if (tx.type === 'INTEREST') {
          // Dividends, JCP, FII rental income and coupons all arrive as INTEREST.
          const amount = txAmount(tx);
          income.push({ date, amount, category, investmentId: inv.id, name: label });
          if (date >= yearAgo) income12m += amount;
        } else {
          const delta = contributionDelta(tx);
          if (delta) {
            contributions.push({ date, delta, category, name: label, quantity: tx.quantity ?? null });
            hasContribution = true;
          }
        }
      }
      if (hasContribution) {
        withHistory++;
      } else {
        // No movements reported: assume the cost basis went in on the purchase date.
        const cost = inv.amountOriginal ?? inv.balance ?? 0;
        const date = (inv.purchaseDate ?? inv.issueDate ?? '').slice(0, 10) || null;
        if (cost) contributions.push({ date, delta: cost, category, name: label, quantity: null, estimated: !date });
      }

      return {
        id: inv.id,
        name: inv.name,
        code: inv.code ?? null,
        type: inv.type,
        subtype,
        category,
        categoryKey: categoryKey(inv),
        categorySource: source,
        segment,
        segmentManual,
        status: inv.status ?? null,
        balance: inv.balance ?? 0,
        amountOriginal: inv.amountOriginal ?? null,
        amountProfit: inv.amountProfit ?? null,
        quantity: inv.quantity ?? null,
        value: inv.value ?? null,
        currencyCode: inv.currencyCode ?? 'BRL',
        rate: inv.rate ?? null,
        rateType: inv.rateType ?? null,
        fixedAnnualRate: inv.fixedAnnualRate ?? null,
        lastMonthRate: inv.lastMonthRate ?? null,
        lastTwelveMonthsRate: inv.lastTwelveMonthsRate ?? null,
        issuer: inv.issuer ?? null,
        dueDate: inv.dueDate ?? null,
        purchaseDate: inv.purchaseDate ?? null,
        income12m,
        institution: inv.institution?.name ?? summary.connector,
        connector: summary.connector,
      };
    });

    return {
      ...summary,
      investments: mapped,
      accounts: accounts.map((acc) => mapAccount(acc, summary.connector)),
      income,
      contributions,
      withHistory,
    };
  } catch (err) {
    return {
      id, connector: 'Unavailable', connectorImage: null, isSandbox: false, status: 'ERROR', executionStatus: null, lastUpdatedAt: null,
      error: (err as Error).message, via: null, investments: [], accounts: [], income: [], contributions: [], withHistory: 0,
    };
  }
}

export const todayInBrazil = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

// One snapshot per day of what the wallet is worth, so the growth chart builds up over time.
async function recordSnapshot(connections: Connection[]): Promise<HistorySnapshot[]> {
  if (!connections.length || connections.some((c) => c.status === 'ERROR')) return readJsonFile<HistorySnapshot[]>(HISTORY_FILE, []);
  const byCategory: HistorySnapshot['byCategory'] = {};
  let invested = 0;
  for (const inv of connections.flatMap((c) => c.investments)) {
    byCategory[inv.category] = (byCategory[inv.category] ?? 0) + inv.balance;
    invested += inv.balance;
  }
  const cash = connections.flatMap((c) => c.accounts).filter((a) => a.type === 'BANK').reduce((s, a) => s + a.balance, 0);
  const date = todayInBrazil();
  const snapshot: HistorySnapshot = { date, total: invested + cash, invested, cash, byCategory };
  const history = (await readJsonFile<HistorySnapshot[]>(HISTORY_FILE, [])).filter((h) => h.date !== date);
  history.push(snapshot);
  history.sort((a, b) => a.date.localeCompare(b.date));
  await writeJsonFile(HISTORY_FILE, history);
  return history;
}

export async function buildPortfolio(): Promise<Portfolio> {
  const [overrides, segmentOverrides] = await Promise.all([
    readJsonFile<Overrides>(OVERRIDES_FILE, {}),
    readJsonFile<SegmentOverrides>(SEGMENTS_FILE, {}),
  ]);
  const connections = await Promise.all((await loadItemIds()).map((id) => loadConnection(id, overrides, segmentOverrides)));
  const history = await recordSnapshot(connections);
  const totalAssets = connections.reduce((s, c) => s + c.investments.length, 0);

  // Undated contributions are assumed to have been there since the first known date.
  const dated = connections.flatMap((c) => c.contributions).filter((c) => c.date);
  const firstDate = dated.map((c) => c.date as string).sort()[0] ?? todayInBrazil();
  const contributions: Contribution[] = connections.flatMap((c) => c.contributions)
    .map((c) => ({ ...c, date: c.date ?? firstDate, estimated: Boolean(c.estimated || !c.date) }));

  return {
    generatedAt: new Date().toISOString(),
    connections: connections.map(({ income, contributions, withHistory, ...rest }) => rest),
    income: connections.flatMap((c) => c.income).sort((a, b) => a.date.localeCompare(b.date)),
    contributions: contributions.sort((a, b) => a.date.localeCompare(b.date)),
    coverage: { withHistory: connections.reduce((s, c) => s + c.withHistory, 0), total: totalAssets },
    history,
  };
}
