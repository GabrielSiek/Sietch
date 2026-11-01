// Shapes of the JSON the server sends to the browser. Imported by both sides (types only).

// ---------- Investments ----------

export type CategoryKey = 'RENDA_FIXA' | 'ACOES' | 'FII' | 'ETF' | 'EXTERIOR' | 'CRIPTO' | 'FUNDOS' | 'PREVIDENCIA' | 'OUTROS';
/** Where an asset's class came from: Pluggy's type, the ticker, the name, or you (set in the holdings table). */
export type CategorySource = 'pluggy' | 'ticker' | 'name' | 'manual';

export interface Status {
  configured: boolean;
  authError: string | null;
  includeSandbox: boolean;
  itemCount: number;
}

export interface Investment {
  id: string;
  name: string;
  code: string | null;
  type: string;
  subtype: string | null;
  category: CategoryKey;
  categoryKey: string;
  categorySource: CategorySource;
  /** Where it sits inside its class (see shared/segments.ts); null when unknown or the class isn't split. */
  segment: string | null;
  /** The segment was set by you in the holdings table. */
  segmentManual: boolean;
  status: string | null;
  balance: number;
  amountOriginal: number | null;
  amountProfit: number | null;
  quantity: number | null;
  value: number | null;
  currencyCode: string;
  rate: number | null;
  rateType: string | null;
  fixedAnnualRate: number | null;
  lastMonthRate: number | null;
  lastTwelveMonthsRate: number | null;
  issuer: string | null;
  dueDate: string | null;
  purchaseDate: string | null;
  income12m: number;
  institution: string;
  connector: string;
}

export interface CreditInfo {
  limit: number | null;
  available: number | null;
  closeDate: string | null;
  dueDate: string | null;
  brand: string | null;
  level: string | null;
  minimumPayment: number | null;
}

export interface Account {
  id: string;
  itemId: string;
  name: string;
  number: string | null;
  type: 'BANK' | 'CREDIT';
  subtype: string | null;
  balance: number;
  currencyCode: string;
  connector: string;
  credit: CreditInfo | null;
}

export type ItemStatus = 'UPDATED' | 'UPDATING' | 'WAITING_USER_INPUT' | 'OUTDATED' | 'LOGIN_ERROR' | 'ERROR' | (string & {});

export interface Connection {
  id: string;
  connector: string;
  connectorImage: string | null;
  isSandbox: boolean;
  status: ItemStatus;
  executionStatus: string | null;
  lastUpdatedAt: string | null;
  error: string | null;
  /** The Pluggy connector when the connection is named after the bank (e.g. "MeuPluggy"). */
  via: string | null;
  investments: Investment[];
  accounts: Account[];
}

/** Dividends, JCP, FII income and coupons. */
export interface IncomeEntry {
  date: string;
  amount: number;
  category: CategoryKey;
  investmentId: string;
  name: string;
}

/** Net money put into (or taken out of) an investment on a day. */
export interface Contribution {
  date: string;
  delta: number;
  category: CategoryKey;
  name: string;
  quantity: number | null;
  /** No date was reported, so it's placed on the first known date. */
  estimated: boolean;
}

export interface HistorySnapshot {
  date: string;
  total: number;
  invested: number;
  cash: number;
  byCategory: Partial<Record<CategoryKey, number>>;
}

export interface Portfolio {
  generatedAt: string;
  connections: Connection[];
  income: IncomeEntry[];
  contributions: Contribution[];
  coverage: { withHistory: number; total: number };
  history: HistorySnapshot[];
}

// ---------- Settings ----------

export interface Goals {
  monthlyContribution: number | null;
  wealthTarget: number | null;
  /** YYYY-MM */
  wealthDate: string | null;
  /** Expected return, % a month. */
  monthlyRate: number;
  /** Target % of the wallet per class. */
  allocation: Partial<Record<CategoryKey, number>>;
  /** Target % of each segment within its class (e.g. FII: { TIJOLO: 60, PAPEL: 40 }). */
  segmentAllocation: Partial<Record<CategoryKey, Record<string, number>>>;
  /** Assets you'd buy next, per class and segment ('' for classes that aren't split). */
  goTo: Partial<Record<CategoryKey, Record<string, string[]>>>;
}

export interface Group {
  id: string;
  name: string;
  icon: string;
  patterns: string[];
  /** Whole Pluggy categories that fall in this group. */
  categories: string[];
  /** Shows its own totals but stays out of Gastos, Saldo and the budget. */
  excludeFromTotals: boolean;
  /** Money received in the group counts as income (e.g. Salário) instead of a reimbursement. */
  income: boolean;
}

export interface Settings {
  goals: Goals;
  /** Per category id, or `group:<id>`. */
  budgets: Record<string, number>;
  budgetTotal: number | null;
  monthlyIncome: number | null;
  /** Rule key (normalized description) → category id. */
  txRules: Record<string, string>;
  groups: Group[];
  /** Transaction id → group id, or 'none'. */
  txGroups: Record<string, string>;
  excludedAccounts: string[];
}

// ---------- Spending ----------

export interface SpendCategory {
  id: string;
  label: string;
  /** Pluggy's English description, used to pick an icon. */
  key: string;
}

export type PaymentMethod = 'cartao' | 'pix' | 'debito' | 'boleto' | 'transferencia' | 'outros';
/** Why a movement is left out of spending and income. */
export type Exclusion = 'own' | 'card' | 'invest';

export interface TxGroupRef {
  id: string;
  name: string;
  icon: string;
  offTotals: boolean;
  income: boolean;
}

export interface Transaction {
  group: TxGroupRef | null;
  groupSource: 'manual' | 'rule' | null;
  counterparty: string | null;
  id: string;
  date: string;
  description: string;
  kind: string | null;
  rawDescription: string;
  amount: number;
  direction: 'in' | 'out';
  accountId: string;
  method: PaymentMethod;
  category: SpendCategory;
  ruleKey: string;
  ruled: boolean;
  excluded: Exclusion | null;
  /** Money moved into (out) or out of (in) your investments. */
  invest: boolean;
  status: string;
  installment: string | null;
}

/** GET /api/transactions */
export interface TransactionsData {
  from: string;
  to: string;
  accounts: Account[];
  transactions: Transaction[];
  categories: SpendCategory[];
  errors: string[];
  budgets: Record<string, number>;
  budgetTotal: number | null;
  monthlyIncome: number | null;
  groups: Group[];
  excludedAccounts: string[];
}

/** GET /api/spending: the month and the one before it. */
export interface SpendingData extends TransactionsData {
  month: string;
}

export interface ConnectToken {
  accessToken: string;
  includeSandbox: boolean;
}
