// Finance Dash — local server that talks to the Pluggy API.
// The Pluggy CLIENT_SECRET never leaves this process; the browser only sees
// short-lived connect tokens and the aggregated portfolio data.
// `--dev` serves the client through Vite (with hot reload); otherwise the build in dist/ is served.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import type { ViteDevServer } from 'vite';
import type { CategoryKey, ConnectToken, Status } from '../shared/types.ts';
import { HttpError } from './http-error.ts';
import { INCLUDE_SANDBOX, configured, getApiKey, pluggy } from './pluggy.ts';
import type { PluggyItem } from './pluggy-types.ts';
import { CATEGORY_KEYS, buildPortfolio, summarizeItem, todayInBrazil, type Overrides } from './portfolio.ts';
import { cleanAmount, cleanBudgets, cleanGoals, cleanGroups, loadSettings } from './settings.ts';
import { buildSpending, loadTransactions } from './spending.ts';
import type { SegmentOverrides } from './segments.ts';
import { OVERRIDES_FILE, ROOT, SEGMENTS_FILE, SETTINGS_FILE, loadItemIds, readJsonFile, saveItemIds, writeJsonFile } from './storage.ts';
import { SEGMENTS } from '../shared/segments.ts';

const SEGMENT_KEYS = new Set(Object.values(SEGMENTS).flatMap((s) => Object.keys(s)));

const DEV = process.argv.includes('--dev');
const DIST_DIR = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;
const SNAPSHOT_EVERY_MS = 6 * 60 * 60 * 1000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
};

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

// The body is trusted to have the shape each route expects; the routes validate the values.
async function readJson<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return (raw ? JSON.parse(raw) : {}) as T;
}

function requireConfig() {
  if (!configured()) {
    throw new HttpError(503, 'Pluggy is not configured. Copy .env.example to .env and fill in your Client ID and Secret.');
  }
}

const searchParams = (req: IncomingMessage) => new URL(req.url ?? '/', 'http://localhost').searchParams;

type Handler = (req: IncomingMessage) => unknown;

const routes: Record<string, Handler> = {
  'GET /api/status': async (): Promise<Status> => {
    let authError: string | null = null;
    if (configured()) {
      try { await getApiKey(); } catch (err) { authError = (err as Error).message; }
    }
    return { configured: configured(), authError, includeSandbox: INCLUDE_SANDBOX, itemCount: (await loadItemIds()).length };
  },

  'POST /api/connect-token': async (req): Promise<ConnectToken> => {
    requireConfig();
    const { itemId } = await readJson<{ itemId?: string }>(req);
    const data = await pluggy<{ accessToken: string }>('/connect_token', { method: 'POST', body: itemId ? { itemId } : {} });
    return { accessToken: data.accessToken, includeSandbox: INCLUDE_SANDBOX };
  },

  'POST /api/items': async (req) => {
    requireConfig();
    const { itemId } = await readJson<{ itemId?: string }>(req);
    if (!itemId || !/^[0-9a-f-]{36}$/i.test(itemId)) throw new HttpError(400, 'A valid itemId (UUID) is required.');
    const item = await pluggy<PluggyItem>(`/items/${itemId}`); // validates it exists for this client
    await saveItemIds([...(await loadItemIds()), itemId]);
    return summarizeItem(item);
  },

  'GET /api/portfolio': async () => {
    requireConfig();
    return buildPortfolio();
  },

  'GET /api/spending': async (req) => {
    requireConfig();
    const month = searchParams(req).get('month') ?? todayInBrazil().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, 'month must be YYYY-MM.');
    return buildSpending(month);
  },

  // Any date range, for the transaction filters (Open Finance usually keeps ~12 months).
  'GET /api/transactions': async (req) => {
    requireConfig();
    const q = searchParams(req);
    const from = q.get('from') ?? '', to = q.get('to') ?? '';
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso.test(from) || !iso.test(to) || from > to) throw new HttpError(400, 'from and to must be YYYY-MM-DD, from ≤ to.');
    if ((Date.parse(to) - Date.parse(from)) / 864e5 > 731) throw new HttpError(400, 'The range can be at most 2 years.');
    return loadTransactions(from, to);
  },

  'GET /api/settings': () => loadSettings(),

  'PUT /api/settings': async (req) => {
    const body = await readJson(req);
    const current = await loadSettings();
    const next = {
      ...current,
      goals: body.goals ? cleanGoals(body.goals as Record<string, unknown>) : current.goals,
      budgets: body.budgets ? cleanBudgets(body.budgets as Record<string, unknown>) : current.budgets,
      budgetTotal: 'budgetTotal' in body ? cleanAmount(body.budgetTotal, 'budgetTotal') : current.budgetTotal,
      monthlyIncome: 'monthlyIncome' in body ? cleanAmount(body.monthlyIncome, 'monthlyIncome') : current.monthlyIncome,
      groups: body.groups ? cleanGroups(body.groups) : current.groups,
      excludedAccounts: Array.isArray(body.excludedAccounts) ? body.excludedAccounts.map(String).slice(0, 100) : current.excludedAccounts,
    };
    // Forget manual assignments to groups that no longer exist.
    const ids = new Set(next.groups.map((g) => g.id));
    next.txGroups = Object.fromEntries(Object.entries(next.txGroups).filter(([, g]) => g === 'none' || ids.has(g)));
    await writeJsonFile(SETTINGS_FILE, next);
    return next;
  },

  // Create a group (used by "+ Novo grupo" in the transactions table).
  'POST /api/groups': async (req) => {
    const body = await readJson<{ name?: unknown; icon?: unknown; patterns?: unknown }>(req);
    const settings = await loadSettings();
    settings.groups = cleanGroups([...settings.groups, { name: body.name, icon: body.icon, patterns: body.patterns ?? [] }]);
    await writeJsonFile(SETTINGS_FILE, settings);
    return settings.groups.at(-1);
  },

  // Put one transaction in a group by hand. groupId: a group id, 'none' (never group it), or null (back to automatic).
  'POST /api/tx-group': async (req) => {
    const { txId, groupId } = await readJson<{ txId?: unknown; groupId?: string | null }>(req);
    if (!txId || typeof txId !== 'string') throw new HttpError(400, 'txId is required.');
    const settings = await loadSettings();
    if (groupId && groupId !== 'none' && !settings.groups.some((g) => g.id === groupId)) throw new HttpError(400, 'Unknown group.');
    if (groupId) settings.txGroups[txId] = groupId;
    else delete settings.txGroups[txId];
    await writeJsonFile(SETTINGS_FILE, settings);
    return { txId, groupId: groupId ?? null };
  },

  // "Always categorize transactions like this one as <category>" (categoryId: null removes the rule).
  'POST /api/tx-rules': async (req) => {
    const { key, categoryId } = await readJson<{ key?: unknown; categoryId?: unknown }>(req);
    if (!key || typeof key !== 'string') throw new HttpError(400, 'key is required.');
    const settings = await loadSettings();
    if (categoryId) settings.txRules[key] = String(categoryId);
    else delete settings.txRules[key];
    await writeJsonFile(SETTINGS_FILE, settings);
    return settings.txRules;
  },

  // Ask Pluggy to re-sync every connection.
  'POST /api/sync': async () => {
    requireConfig();
    const ids = await loadItemIds();
    const results = await Promise.allSettled(ids.map((id) => pluggy(`/items/${id}`, { method: 'PATCH', body: {} })));
    return { requested: ids.length, failed: results.filter((r) => r.status === 'rejected').length };
  },

  // Manually set (or with category: null, reset) the category of a ticker.
  'POST /api/categories': async (req) => {
    const { key, category } = await readJson<{ key?: unknown; category?: CategoryKey | null }>(req);
    if (!key || typeof key !== 'string') throw new HttpError(400, 'key is required.');
    if (category != null && !CATEGORY_KEYS.includes(category)) throw new HttpError(400, `category must be one of ${CATEGORY_KEYS.join(', ')}.`);
    const overrides = await readJsonFile<Overrides>(OVERRIDES_FILE, {});
    if (category) overrides[key.toUpperCase()] = category;
    else delete overrides[key.toUpperCase()];
    await writeJsonFile(OVERRIDES_FILE, overrides);
    return overrides;
  },

  // Manually set (or with segment: null, reset) the segment of a ticker within its class.
  'POST /api/segments': async (req) => {
    const { key, segment } = await readJson<{ key?: unknown; segment?: unknown }>(req);
    if (!key || typeof key !== 'string') throw new HttpError(400, 'key is required.');
    if (segment != null && (typeof segment !== 'string' || !SEGMENT_KEYS.has(segment))) throw new HttpError(400, `segment must be one of ${[...SEGMENT_KEYS].join(', ')}.`);
    const overrides = await readJsonFile<SegmentOverrides>(SEGMENTS_FILE, {});
    if (segment) overrides[key.toUpperCase()] = segment;
    else delete overrides[key.toUpperCase()];
    await writeJsonFile(SEGMENTS_FILE, overrides);
    return overrides;
  },
};

const paramRoutes: [RegExp, (req: IncomingMessage, params: string[]) => Promise<unknown>][] = [
  // Trigger a fresh sync of one connection.
  [/^POST \/api\/items\/([0-9a-f-]{36})\/refresh$/i, async (_req, [id]) => summarizeItem(await pluggy<PluggyItem>(`/items/${id}`, { method: 'PATCH', body: {} }))],
  // Forget a connection locally (does not delete it on Pluggy).
  [/^DELETE \/api\/items\/([0-9a-f-]{36})$/i, async (_req, [id]) => {
    await saveItemIds((await loadItemIds()).filter((x) => x !== id));
    return { removed: id };
  }],
];

// The built client. Hashed files under /assets/ never change, so browsers may keep them for good.
async function serveStatic(pathname: string, res: ServerResponse) {
  if (!existsSync(join(DIST_DIR, 'index.html'))) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Client not built — run `yarn build` (or `yarn start`, which builds first).');
    return;
  }
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^([/\\])+/, '');
  const file = join(DIST_DIR, rel);
  if (!file.startsWith(DIST_DIR + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    ...(pathname.startsWith('/assets/') ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {}),
  });
  res.end(await readFile(file));
}

let vite: ViteDevServer | null = null;

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const key = `${req.method} ${pathname}`;
  try {
    if (routes[key]) return sendJson(res, 200, await routes[key](req));
    for (const [pattern, handler] of paramRoutes) {
      const match = key.match(pattern);
      if (match) return sendJson(res, 200, await handler(req, match.slice(1)));
    }
    if (pathname.startsWith('/api/')) throw new HttpError(404, 'Unknown endpoint');
    if (vite) return vite.middlewares(req, res);
    if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
    await serveStatic(pathname, res);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : err instanceof SyntaxError ? 400 : 500;
    if (!(err instanceof HttpError)) console.error(err);
    sendJson(res, status, { error: (err as Error).message });
  }
});

if (DEV) {
  const { createServer: createViteServer } = await import('vite');
  // 'native' imports vite.config.ts directly. The default bundles it to a temp file and deletes it, and
  // `node --watch` sees that deleted import and restarts the server in a loop.
  vite = await createViteServer({ root: ROOT, configLoader: 'native', server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
}

// Keep the history going while the server runs, even if the page isn't open.
async function backgroundSnapshot() {
  if (!configured() || !(await loadItemIds()).length) return;
  try { await buildPortfolio(); } catch (err) { console.error('Snapshot failed:', (err as Error).message); }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Finance Dash running at http://localhost:${PORT}`);
  if (!configured()) {
    console.warn('⚠  PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET missing — copy .env.example to .env and fill them in.');
  }
  setTimeout(backgroundSnapshot, 5000);
  setInterval(backgroundSnapshot, SNAPSHOT_EVERY_MS).unref();
});
