// Investment classes, Pluggy subtypes, group colors and connection statuses.
import type { CategoryKey, Connection } from '@shared/types';
import { segmentsOf } from '@shared/segments';
import type { IconName } from './icons';
import type { Tone } from '@/components/ui';

/** A CSS custom property name, e.g. '--c-rf'. */
export type ColorVar = `--${string}`;
export const cssv = (name: ColorVar) => `var(${name})`;
/** The color at 15% over the surface, for tile and chip backgrounds. */
export const soft = (name: ColorVar) => `color-mix(in srgb, var(${name}) 15%, transparent)`;

export type ClassKey = CategoryKey | 'CAIXA';
interface ClassMeta { label: string; short: string; color: ColorVar; icon: IconName }

// Fixed color per class.
export const CATEGORIES: Record<ClassKey, ClassMeta> = {
  RENDA_FIXA: { label: 'Renda fixa', short: 'RF', color: '--c-rf', icon: 'rf' },
  ACOES: { label: 'Ações', short: 'AÇ', color: '--c-acoes', icon: 'acoes' },
  FII: { label: 'FIIs', short: 'FII', color: '--c-fii', icon: 'fii' },
  ETF: { label: 'ETFs', short: 'ETF', color: '--c-etf', icon: 'etf' },
  EXTERIOR: { label: 'Exterior', short: 'EXT', color: '--c-ext', icon: 'exterior' },
  CRIPTO: { label: 'Cripto', short: '₿', color: '--c-cripto', icon: 'cripto' },
  FUNDOS: { label: 'Fundos', short: 'FD', color: '--c-fundos', icon: 'fundos' },
  PREVIDENCIA: { label: 'Previdência', short: 'PV', color: '--c-prev', icon: 'prev' },
  OUTROS: { label: 'Outros', short: '•••', color: '--c-outros', icon: 'outros' },
  CAIXA: { label: 'Caixa', short: 'R$', color: '--c-caixa', icon: 'caixa' },
};
export const CLASS_KEYS = Object.keys(CATEGORIES) as ClassKey[];
/** Every class an asset can be in (Caixa is only cash in accounts). */
export const ASSET_CLASSES = CLASS_KEYS.filter((k): k is CategoryKey => k !== 'CAIXA');
export const CORE_CATEGORIES: CategoryKey[] = ['RENDA_FIXA', 'ACOES', 'FII', 'ETF'];
export const cat = (key: string) => CATEGORIES[key as ClassKey] ?? CATEGORIES.OUTROS;

export const SUBTYPES: Record<string, string> = {
  CDB: 'CDB', LCI: 'LCI', LCA: 'LCA', LC: 'LC', CRI: 'CRI', CRA: 'CRA', LIG: 'LIG', LF: 'LF',
  TREASURY: 'Tesouro Direto', DEBENTURES: 'Debêntures',
  STOCK: 'Ação', BDR: 'BDR', UNIT: 'Unit', REAL_ESTATE_FUND: 'Fundo imobiliário', SUBSCRIPTION_RIGHT: 'Direito de subscrição',
  DERIVATIVES: 'Derivativo', OPTION: 'Opção', ETF: 'Fundo de índice', RETIREMENT: 'Previdência', PGBL: 'PGBL', VGBL: 'VGBL', STRUCTURED_NOTE: 'COE',
  INVESTMENT_FUND: 'Fundo de investimento', STOCK_FUND: 'Fundo de ações', MULTIMARKET_FUND: 'Multimercado', EXCHANGE_FUND: 'Fundo cambial',
  FIXED_INCOME_FUND: 'Fundo de renda fixa', FIP_FUND: 'FIP', OFFSHORE_FUND: 'Fundo offshore', ETF_FUND: 'Fundo de ETF',
  CHECKING_ACCOUNT: 'Conta corrente', SAVINGS_ACCOUNT: 'Poupança', CREDIT_CARD: 'Cartão de crédito',
};
export const subtypeLabel = (s: string | null | undefined) =>
  (s ? SUBTYPES[s] ?? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');

// Fixed color per segment, distinct within its class.
const SEGMENT_COLORS: Record<string, ColorVar> = {
  POS: '--c-rf', INFLACAO: '--c-prev', PRE: '--c-acoes',
  EXT_ACOES: '--c-acoes', EXT_ETF: '--c-etf',
  TIJOLO: '--c-fii', PAPEL: '--c-rf', HIBRIDO: '--c-acoes', FOF: '--c-etf',
  ACOES_BR: '--c-acoes', ACOES_GLOBAL: '--c-fii', RENDA_FIXA: '--c-rf', OURO: '--c-etf', CRIPTO: '--c-cripto',};
export const NO_SEGMENT = 'Sem segmento';
export const segmentLabel = (category: CategoryKey, segment: string | null) => (segment && segmentsOf(category)?.[segment]) || NO_SEGMENT;
export const segmentColor = (segment: string | null): ColorVar => (segment && SEGMENT_COLORS[segment]) || '--c-outros';

// Fixed color per spending group, by its position in your list.
export const GROUP_COLORS: ColorVar[] = ['--c-acoes', '--c-fii', '--c-etf', '--c-rf', '--c-fundos', '--c-prev'];
export const groupColor = (groups: { id: string }[], id: string) => GROUP_COLORS[Math.max(groups.findIndex((g) => g.id === id), 0) % GROUP_COLORS.length];

const STATUS: Record<string, [Tone, string]> = {
  UPDATED: ['pos', 'Ativa'],
  UPDATING: ['warn', 'Sincronizando…'],
  WAITING_USER_INPUT: ['warn', 'Precisa da sua ação'],
  OUTDATED: ['warn', 'Reconectar'],
  LOGIN_ERROR: ['neg', 'Erro de login'],
  ERROR: ['neg', 'Erro'],
};
export const connectionStatus = (c: Connection): [Tone, string] => STATUS[c.status] ?? ['warn', c.status];
