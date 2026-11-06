# Sietch

A personal finance app for a Brazilian investor: investments, goals and spending in one place. Data comes from your banks and brokers through [Pluggy](https://pluggy.ai). The design follows the "App financeiro" canvas.

**Investimentos**
- **Patrimônio investido:** current value against accumulated contributions (*valor aplicado*) for 1M / 6M / 1A / Tudo, plus total invested, result, total return, 12‑month dividends and cash in your accounts
- **Distribuição da carteira:** donut chart by asset class
- **Class cards:** Renda fixa, Ações, FIIs and ETFs (plus Fundos, Previdência and Outros when you hold them), each with % of wallet, change this month, return since purchase and a sparkline. Click a card to filter the table.
- **Metas:** this month's contribution against your monthly goal (with a 12‑month history), a wealth goal with the monthly contribution it needs, and a target allocation compared with your current wallet, including where to put the rest of this month's contribution
- **Proventos:** dividends, JCP, FII income and coupons per month, stacked by class
- **Destaques:** the month's biggest gainers and losers
- **Meus ativos:** quantity, average price, current price, amount invested, current value, result and weight. The class of each holding can be changed in place.

**Gastos**
- Spending, income, the month's balance (and share saved) and budget use, with a month picker and an account filter
- **Para onde vai seu dinheiro:** spending by category against each category's budget (Dentro / Atenção / Estourou)
- **Por meio de pagamento:** credit card, Pix, debit, boleto, transfer
- **Cartões de crédito:** current bill, limit used, closing and due dates
- **Ritmo de gastos:** spending accumulated day by day against last month, your budget, and a projection for the end of the month
- **Meus grupos:** your own groups (e.g. Basquete, Futebol, Cinema). A group collects transactions by keywords or names (description, merchant, or the person on the other side of a Pix), by whole Pluggy categories, or by hand. Money you **receive** that falls in a group, such as a colleague paying their share of the court, reduces that group's spending instead of counting as income.
- **Transações:** filter by text, period (the selected month, the last 3, 6 or 12 months, or custom dates), group or category, payment method, and incoming or outgoing. Choose a group in a transaction's category column to move it there, or **＋ Novo grupo** to create one. Click a group or category anywhere on the page to filter to it.
- **Contas fora dos totais:** a card or account can stay visible while being left out of every total (set in Configurações).

**Contas conectadas** lets you connect, sync, reconnect or remove institutions. **Configurações** is where you set goals, budgets and category rules.

## Setup

Requires Node.js 22.18+ (the server runs its TypeScript directly) and [Yarn](https://classic.yarnpkg.com) 1.x.

1. Run `yarn install`.
2. In [dashboard.pluggy.ai](https://dashboard.pluggy.ai), open your application and copy its **Client ID** and **Client Secret**.
3. Put them in `.env` in the project root (copy `.env.example` if `.env` doesn't exist yet):
   ```
   PLUGGY_CLIENT_ID=...
   PLUGGY_CLIENT_SECRET=...
   ```
   You don't need the API key shown in the Pluggy dashboard. It expires after 2 hours, and the server creates new ones from the ID and secret.
4. Run `yarn start` (it builds the client first) and open http://localhost:3000.

### Trying it with test data
In **Contas conectadas → Conectar conta**, pick **Pluggy Bank** (sandbox) and log in with `user-ok` / `password-ok`. If it asks for an MFA code, use `123456`.

### Connecting your real accounts
Trial applications can connect real institutions through **MeuPluggy**:
1. Create an account at [meu.pluggy.ai](https://meu.pluggy.ai) and link your banks and brokers there.
2. In Sietch, open **Contas conectadas → Conectar conta**, choose **MeuPluggy** and log in.

## Where each number comes from

| On screen | Pluggy source |
|---|---|
| Asset classes | Pluggy's `type` + `subtype` when it's specific (Renda fixa = `FIXED_INCOME`, FII = `REAL_ESTATE_FUND`…). Open Finance (MeuPluggy) reports every B3 ticker as `EQUITY/STOCK`, so those are classified by ticker: known ETFs / units → ETF / Ações, other `…11` → FII, `…12`–`…15` → FII subscription rights, `…32`–`…35` → BDR, `…3`–`…8` → Ações. Changes you make in the table are saved in `data/categories.json`. |
| Value, invested amount, profit | `balance`, `amountOriginal`, `amountProfit`. Average price = amount invested ÷ quantity. |
| Change this month, highlights | `lastMonthRate`. If the institution doesn't report it, `lastTwelveMonthsRate` or the return since purchase is used instead. |
| Proventos | Investment transactions of type `INTEREST` |
| Valor aplicado, monthly contributions | Investment transactions `BUY` − `SELL`/`AMORTIZATION`. Assets without transactions count their invested amount on the purchase date. |
| Patrimônio line, sparklines | Pluggy only returns the **current** value, so the server saves one snapshot per day in `data/history.json`. These lines fill in from the first day you run the app. |
| Spending and income | `GET /v2/transactions` for every account. Categories come from Pluggy's categorization (`/categories`, Portuguese names). Transfers between your own accounts, credit‑card bill payments and investment movements ("Compra de Renda Variável", "Resgate RDB", "Aplicação CDB"…) are **not** counted, so nothing is counted twice. Spending = what you paid − what you got back in your groups. |
| Groups | A keyword matches when all its words appear in the description, merchant or Pix counterparty, in any order, ignoring case and accents ("maria silva" matches "Maria Souza Silva"). Keyword matches win over whole‑category groups. |
| Payment method | Credit card accounts → Cartão. For bank accounts: `operationType` / `paymentData.paymentMethod` (PIX, BOLETO, CARTAO = debit, TED/DOC), or the description when those are missing. |
| Credit cards | The account's `balance` and `creditData` (limit, available limit, closing and due dates) |
| Goals, budgets, rules | Set by you in **Configurações** and saved in `data/settings.json` |

How complete the data is depends on the institution. Some don't report transactions, profit or rates, and Sietch shows "—" in those cases. Snapshots are only saved while the server is running (on start, then every 6 hours, plus whenever you open the page). If you test with sandbox data, delete `data/history.json` before you switch to real accounts.

## How it works

```
browser (src/, React)  ──►  server/ (Node)  ──►  api.pluggy.ai
                            keeps the secret,
                            caches API key
                            and transactions
```

Everything is TypeScript. `shared/types.ts` describes the JSON the server sends, and both sides compile against it.

- **Client** (`src/`): React, styled-components, Chart.js and axios, built with Vite. `App.tsx` holds the shell and the hash routes, and `store.ts` holds the shared data and the actions that load it. Each page under `pages/` and each shared piece under `components/` is a folder with `index.tsx` and `styles.ts` (`import * as Styled from './styles'`). Shared styled primitives (cards, chips, buttons, tables…) are in `components/ui`, and the color tokens are CSS variables in `styles/global.ts`.
- **Server** (`server/`): plain `node:http`, run by Node's built‑in type stripping, so it has no build step. `index.ts` has the routes, `pluggy.ts` the API client, and `portfolio.ts`, `spending.ts` and `settings.ts` the data logic.

- The server listens only on `127.0.0.1`, so your Client Secret never reaches the browser. `.env` and `data/` are in `.gitignore`.
- Pluggy has no endpoint that lists all your items, so the server stores your connection IDs in `data/items.json`. You can also add IDs by hand in **Contas conectadas** or with `PLUGGY_ITEM_IDS` in `.env`.
- Transactions are cached in memory until the connection syncs again.

| Endpoint | Purpose |
|---|---|
| `GET /api/status` | Whether credentials are configured |
| `GET /api/portfolio` | Connections, investments, accounts, income, contributions and history |
| `GET /api/spending?month=YYYY-MM` | Accounts and the transactions of that month and the one before |
| `GET /api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD` | Transactions of any range up to 2 years (for the filters) |
| `GET` / `PUT /api/settings` | Goals, budgets, groups and accounts left out of the totals |
| `POST /api/groups` | `{ name, icon?, patterns?, categories? }`: create a group |
| `POST /api/tx-group` | `{ txId, groupId }`: put one transaction in a group (`'none'` keeps it out of every group, `null` goes back to automatic) |
| `POST /api/tx-rules` | `{ key, categoryId }`: always put transactions like this one in that category (`null` removes the rule) |
| `POST /api/categories` | `{ key, category }`: set an asset's class (`null` resets it) |
| `POST /api/connect-token` | Token for the Pluggy Connect widget (`{ itemId }` to reconnect) |
| `POST /api/sync` | Ask Pluggy to re‑sync every connection |
| `POST /api/items` · `POST /api/items/:id/refresh` · `DELETE /api/items/:id` | Add, sync or remove one connection (removing doesn't delete it on Pluggy) |

| Command | |
|---|---|
| `yarn dev` | Server plus Vite on http://localhost:3000. Client edits hot-reload, and server edits restart it. |
| `yarn start` | Builds the client into `dist/` and serves it |
| `yarn typecheck` | Type-checks the client and the server |
