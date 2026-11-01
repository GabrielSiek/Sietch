// Icon stroke paths (24×24), drawn by <Icon d={ICON.x} />.

export const ICON = {
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  plus: 'M12 5v14M5 12h14',
  up: 'M12 20V8M6 14l6-6 6 6M5 4h14',
  down: 'M12 4v12M6 10l6 6 6-6M5 20h14',
  coin: 'M12 3v18M17 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6',
  sync: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
  // navigation
  brand: 'M4 16l5-5 4 4 7-7M15 8h5v5',
  chart: 'M3 3v18h18M7 14l4-4 3 3 5-5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  // asset classes
  rf: 'M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18',
  acoes: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  fii: 'M4 21V6l8-3v18M12 9h8v12M3 21h18M7 9h2M7 13h2M7 17h2M15 13h2M15 17h2',
  etf: 'M12 3l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
  exterior: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  cripto: 'M9 4v16M13 4v2M13 18v2M7 6h7.5a3 3 0 0 1 0 6H7M7 12h8.5a3 3 0 0 1 0 6H7',
  fundos: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3v9l6.4 6.4',
  prev: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4',
  caixa: 'M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-4a2 2 0 0 0 0 4h4v2a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6M21 13v4',
  outros: 'M5 12h.01M12 12h.01M19 12h.01',
  // payment methods
  cartao: 'M3 6h18v12H3zM3 10h18M7 15h3',
  pix: 'M12 3l9 9-9 9-9-9zM9 12h6',
  debito: 'M3 6h18v12H3zM3 10h18M14 15h3',
  boleto: 'M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14',
  transferencia: 'M7 7h13l-4-4M17 17H4l4 4',
  // spending categories (matched by Pluggy's English top-level description)
  moradia: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  mercado: 'M3 4h2l2.4 11h11L21 8H6.2M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  compras: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  alimentacao: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 0-3 2-3 5v5h3',
  transporte: 'M5 12l2-5h10l2 5M3 12h18v5H3zM6 17v2M18 17v2M7 14.5h1M16 14.5h1',
  saude: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  lazer: 'M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4zM14 6v12',
  assinaturas: 'M3 5h18v12H3zM8 21h8M10 9l4 2-4 2z',
  educacao: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  viagem: 'M2 16l20-8-4 10-6-3-3 4v-5l9-6',
  servicos: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  impostos: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  taxas: 'M3 10l9-6 9 6M5 10v8M19 10v8M3 20h18M10 14h4',
  emprestimos: 'M4 7h16v10H4zM12 9.5v5M10 11h3a1 1 0 0 1 0 2h-2',
  pets: 'M5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 12c-3 0-6 4-6 6.5 0 1.5 1.5 2 3 1.5 1-.3 2-.5 3-.5s2 .2 3 .5c1.5.5 3 0 3-1.5 0-2.5-3-6.5-6-6.5z',
  receita: 'M12 4v12M6 10l6 6 6-6M5 20h14',
  // custom group icons
  investimentos: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  basquete: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3v18M5.6 5.6c3 2.6 3 10.2 0 12.8M18.4 5.6c-3 2.6-3 10.2 0 12.8',
  futebol: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4zM12 7.5V3.2M15.8 10.3l4.3-1.4M14.3 14.7l2.7 3.6M9.7 14.7L7 18.3M8.2 10.3L3.9 8.9',
  cinema: 'M3 8h18v12H3zM3 8l3-4.5h3L6 8M9 8l3-4.5h3L12 8M15 8l3-4.5h3',
  trabalho: 'M3 7h18v13H3zM8.5 7V4.5h7V7M3 12.5h18',
  casa: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  group: 'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2.4.7 4 2.6 4 5.2',
} as const;

export type IconName = keyof typeof ICON;

export const GROUP_ICON_OPTIONS: [IconName, string][] = [
  ['investimentos', 'Investimentos'], ['basquete', 'Basquete'], ['futebol', 'Futebol'], ['cinema', 'Cinema'], ['trabalho', 'Trabalho'], ['casa', 'Casa'],
  ['viagem', 'Viagem'], ['pets', 'Pets'], ['saude', 'Saúde'], ['lazer', 'Lazer'], ['compras', 'Compras'],
  ['alimentacao', 'Alimentação'], ['transporte', 'Transporte'], ['educacao', 'Educação'], ['outros', 'Outros'],
];
export const groupIcon = (key: string): string => ICON[key as IconName] ?? ICON.group;

// Icon for a Pluggy top-level category, by its English description.
const SPEND_ICONS: [RegExp, IconName][] = [
  [/hous|rent|utilit/, 'moradia'], [/grocer|supermarket/, 'mercado'], [/shop/, 'compras'], [/food|drink|restaurant|deliver/, 'alimentacao'],
  [/transport|vehicle|fuel|automotive/, 'transporte'], [/health|pharma|medic/, 'saude'], [/leisure|entertain|sport/, 'lazer'],
  [/digital|subscri|stream/, 'assinaturas'], [/educat/, 'educacao'], [/travel/, 'viagem'], [/service/, 'servicos'],
  [/invest/, 'acoes'], [/tax|legal/, 'impostos'], [/bank fee|fee/, 'taxas'], [/loan|financ/, 'emprestimos'], [/pet/, 'pets'], [/transfer/, 'transferencia'],
  [/income/, 'receita'],
];
export function spendIcon(key = ''): string {
  const k = key.toLowerCase();
  return ICON[SPEND_ICONS.find(([re]) => re.test(k))?.[1] ?? 'outros'];
}
