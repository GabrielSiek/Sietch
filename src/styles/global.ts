// Design tokens from the "App financeiro" canvas, plus base element styles.
// Colors stay CSS custom properties so dark mode is one class on <html> and Chart.js can read them.
import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light;
    --bg: #F3F4F7; --surface: #FFFFFF; --surface-2: #F0F1F5; --border: #E3E5EB;
    --text: #12141A; --muted: #5C6270; --accent: #5143E0; --accent-soft: #ECEAFD; --on-accent: #FFFFFF;
    --pos: #12784A; --pos-soft: #E3F4EA; --neg: #C42B36; --neg-soft: #FCE9EA; --warn: #A1560A; --warn-soft: #FCF0E1;
    --c-rf: #2F6FEB; --c-acoes: #6D4AE0; --c-fii: #0E9384; --c-etf: #D98A0B; --c-ext: #0EA5E9; --c-cripto: #E8590C; --c-fundos: #D23F96;
    --c-prev: #65A30D; --c-caixa: #64748B; --c-outros: #8A8F9C;
    --m-cartao: #6D4AE0; --m-pix: #0E9384; --m-debito: #2F6FEB; --m-boleto: #D98A0B; --m-transferencia: #D23F96; --m-outros: #8A8F9C;
    --shadow: 0 1px 2px rgba(16, 18, 26, .04), 0 6px 20px rgba(16, 18, 26, .04);
    --sk-shine: rgba(255, 255, 255, .65);
  }
  :root.dark {
    color-scheme: dark;
    --bg: #0B0D12; --surface: #14171F; --surface-2: #1C2029; --border: #262A35;
    --text: #F1F2F5; --muted: #9BA1B0; --accent: #8E85FF; --accent-soft: #232046; --on-accent: #0B0D12;
    --pos: #3FD68D; --pos-soft: #0F2A1D; --neg: #FF6C75; --neg-soft: #34161A; --warn: #F4A84B; --warn-soft: #33230F;
    --c-rf: #5B91FF; --c-acoes: #9B7DFF; --c-fii: #2CC5B2; --c-etf: #F2B23A; --c-ext: #38BDF8; --c-cripto: #FF8A4C; --c-fundos: #F06BBE;
    --c-prev: #84CC16; --c-caixa: #94A3B8; --c-outros: #6B7280;
    --m-cartao: #9B7DFF; --m-pix: #2CC5B2; --m-debito: #5B91FF; --m-boleto: #F2B23A; --m-transferencia: #F06BBE; --m-outros: #6B7280;
    --shadow: none;
    --sk-shine: rgba(255, 255, 255, .05);
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    background: var(--bg); color: var(--text);
    font: 15px/1.45 'Geist', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased;
  }
  a { color: var(--accent); }
  a:hover { color: var(--text); }
  button, input, select, textarea { font-family: inherit; }
  h1, h2, h3 { margin: 0; }
  [hidden] { display: none !important; }
  code { font-size: 13px; padding: 1px 6px; border-radius: 6px; background: var(--surface-2); }
`;
