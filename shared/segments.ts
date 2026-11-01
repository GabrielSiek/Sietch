// Segments: a finer split inside a class — ETFs by what they track, FIIs tijolo × papel,
// fixed income by indexer and assets abroad stocks × ETFs. Imported by both sides.
import type { CategoryKey } from './types.ts';

export const SEGMENTS = {
  RENDA_FIXA: { POS: 'Pós-fixado', INFLACAO: 'Inflação', PRE: 'Prefixado' },
  FII: { TIJOLO: 'Tijolo', PAPEL: 'Papel', HIBRIDO: 'Híbrido', FOF: 'Fundo de fundos' },
  ETF: { ACOES_BR: 'Ações Brasil', ACOES_GLOBAL: 'Ações global', RENDA_FIXA: 'Renda fixa', OURO: 'Ouro', CRIPTO: 'Cripto' },
  EXTERIOR: { EXT_ACOES: 'Ações e BDRs', EXT_ETF: 'ETFs' },
} satisfies Partial<Record<CategoryKey, Record<string, string>>>;

/** The segments of a class, or null for classes that aren't split (Fundos, Previdência, Outros). */
export const segmentsOf = (category: CategoryKey): Record<string, string> | null =>
  (SEGMENTS as Partial<Record<CategoryKey, Record<string, string>>>)[category] ?? null;

export const isSegmentOf = (category: CategoryKey, segment: string) => Object.hasOwn(segmentsOf(category) ?? {}, segment);
