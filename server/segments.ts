// ---------- Segments ----------
// Pluggy reports none of this, so segments come from known tickers, the asset's name or its rate.
// Whatever is set from the holdings table wins (as long as it fits the asset's class).

import type { CategoryKey } from '../shared/types.ts';
import { isSegmentOf } from '../shared/segments.ts';
import type { PluggyInvestment } from './pluggy-types.ts';

export type SegmentOverrides = Record<string, string>;

/** "BOVA11F" → { ticker: "BOVA11", root: "BOVA", suffix: 11 }. */
export function parseTicker(code: string | null | undefined) {
  const m = /^([A-Z0-9]{4})(\d{1,2})F?$/.exec((code ?? '').toUpperCase());
  return m ? { ticker: `${m[1]}${m[2]}`, root: m[1], suffix: Number(m[2]) } : null;
}

const byTicker = (groups: Record<string, string>) =>
  new Map(Object.entries(groups).flatMap(([segment, list]) => list.trim().split(/\s+/).map((t) => [t, segment] as const)));

// B3 ETFs, by what they track.
export const ETF_SEGMENTS = byTicker({
  ACOES_BR: 'BOVA11 BOVV11 BOVB11 BOVX11 BOVS11 XBOV11 PIBB11 BRAX11 SMAL11 SMAC11 ECOO11 ISUS11 DIVO11 NDIV11 FIND11 MATB11 GOVE11 ESGB11 AUVP11',
  ACOES_GLOBAL: 'IVVB11 SPXI11 SPXB11 NASD11 TECK11 UTEC11 ACWI11 WRLD11 EURP11 XINA11',
  OURO: 'GOLD11',
  CRIPTO: 'HASH11 QBTC11 BITH11 BITI11 ETHE11 QETH11 DEFI11 WEB311',
  RENDA_FIXA: 'IMAB11 IRFM11 IB5M11 B5P211 B5MB11 IMBB11 FIXA11 LFTS11 LFTB11 DEBB11 NTNS11',
});

// Common FIIs, by the first four letters so subscription rights (KNCR12…) follow their fund.
const FII_SEGMENTS = byTicker({
  TIJOLO: `HGLG XPLG BTLG VILG LVBI BRCO GGRC ALZR TRXF HGRE PVBI JSRE RBRP BRCR XPML VISC HSML MALL HGBS HGRU KNRI HSLG
    GARE TGAR RCRB SDIL PATL GTWR XPIN RECT HGPO RBVA VINO`,
  PAPEL: `KNCR KNIP KNHY KNSC KNUQ MXRF CPTS IRDM RECR HGCR VGIR RBRR RBRY VRTA MCCI BCRI DEVA HCTR XPCI VGHF CVBI RZAK
    CACR VCJR AFHI HABT URPR OUJP BTCI VGIP`,
  FOF: 'BCFF HFOF RBRF KFOF MGFF XPSF HGFF',
});

function etfSegment(inv: PluggyInvestment, ticker: string | undefined): string {
  const known = ticker && ETF_SEGMENTS.get(ticker);
  if (known) return known;
  const name = inv.name ?? '';
  if (/\bouro\b|\bgold\b/i.test(name)) return 'OURO';
  if (/bitcoin|\bbtc\b|cripto|crypto|ether|blockchain/i.test(name)) return 'CRIPTO';
  if (/renda fixa|tesouro|ima-?b|irf-?m|deb[eê]nture|selic|\bntn|\blft/i.test(name)) return 'RENDA_FIXA';
  if (/s&p|nasdaq|msci|world|global|eua|usa|europ|china|internacional/i.test(name)) return 'ACOES_GLOBAL';
  // BDRs of ETFs and assets priced in other currencies are abroad; most B3 ETFs track Brazilian stocks.
  return inv.subtype === 'BDR' || (inv.currencyCode && inv.currencyCode !== 'BRL') ? 'ACOES_GLOBAL' : 'ACOES_BR';
}

function fiiSegment(inv: PluggyInvestment, root: string | undefined): string | null {
  const known = root && FII_SEGMENTS.get(root);
  if (known) return known;
  const name = inv.name ?? '';
  if (/h[ií]brido/i.test(name)) return 'HIBRIDO';
  if (/fundo de fundos|\bfof\b/i.test(name)) return 'FOF';
  if (/receb[ií]veis|\bcri\b|cr[eé]dito|high ?yield|papel|t[ií]tulos/i.test(name)) return 'PAPEL';
  if (/log[ií]stic|shopping|lajes|corporat|renda urbana|galp[oõ]|industri|varejo|hotel|desenvolv|edif/i.test(name)) return 'TIJOLO';
  return null;
}

const CRYPTO_NAME = /bitcoin|\bbtc\b|ethereum|\beth\b|cripto|crypto|solana|\bsol\b|cardano|\bada\b|ripple|\bxrp\b|litecoin|polygon|tether|usdt|usdc|stablecoin|blockchain/i;
export const isCrypto = (inv: PluggyInvestment) => /^CRYPTO/i.test(inv.type) || CRYPTO_NAME.test(`${inv.name ?? ''} ${inv.code ?? ''}`);

function indexerSegment(text: string | null | undefined): string | null {
  const s = (text ?? '').toUpperCase();
  if (/IPCA|IGP|INPC|RENDA\+|EDUCA\+/.test(s)) return 'INFLACAO';
  if (/CDI|SELIC|\bDI\b/.test(s)) return 'POS';
  if (/\bPR[EÉ](FIXADO)?\b/.test(s)) return 'PRE';
  return null;
}

// Fixed income by indexer: the reported rate type first, then the name (Tesouro bonds say it there).
function fixedIncomeSegment(inv: PluggyInvestment): string | null {
  return indexerSegment(inv.rateType) ?? indexerSegment(inv.name) ?? (inv.fixedAnnualRate && !inv.rateType ? 'PRE' : null);
}

/** A stock or ETF invested outside Brazil: BDRs, assets priced in another currency and ETFs of foreign indices. */
export function isAbroad(inv: PluggyInvestment, category: CategoryKey, subtype: string | null): boolean {
  if (subtype === 'BDR' || (inv.currencyCode && inv.currencyCode !== 'BRL')) return true;
  return category === 'ETF' && etfSegment(inv, parseTicker(inv.code || inv.name)?.ticker) === 'ACOES_GLOBAL';
}

function autoSegment(inv: PluggyInvestment, category: CategoryKey, subtype: string | null): string | null {
  const t = parseTicker(inv.code || inv.name);
  switch (category) {
    case 'ETF': return etfSegment(inv, t?.ticker);
    // ETF BDRs end in 39 (stock BDRs in 31–35).
    case 'EXTERIOR': return inv.type === 'ETF' || subtype === 'ETF' || t?.suffix === 39 || (t && ETF_SEGMENTS.has(t.ticker)) ? 'EXT_ETF' : 'EXT_ACOES';
    case 'FII': return fiiSegment(inv, t?.root);
    case 'RENDA_FIXA': return fixedIncomeSegment(inv);
    default: return null;
  }
}

/** The asset's segment within its class, and whether you set it. */
export function segmentOf(inv: PluggyInvestment, key: string, category: CategoryKey, subtype: string | null, overrides: SegmentOverrides) {
  const manual = overrides[key];
  if (manual && isSegmentOf(category, manual)) return { segment: manual, segmentManual: true };
  return { segment: autoSegment(inv, category, subtype), segmentManual: false };
}
