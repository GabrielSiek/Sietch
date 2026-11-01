// ---------- Local storage ----------
// Pluggy has no "list my items" endpoint, so we remember the item IDs we create.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const DATA_FILE = join(DATA_DIR, 'items.json');
export const HISTORY_FILE = join(DATA_DIR, 'history.json');
export const OVERRIDES_FILE = join(DATA_DIR, 'categories.json'); // { "TICKER": "ETF", ... } set from the UI
export const SEGMENTS_FILE = join(DATA_DIR, 'segments.json'); // { "TICKER": "PAPEL", ... } set from the UI
export const SETTINGS_FILE = join(DATA_DIR, 'settings.json'); // goals, budgets and transaction category rules

export async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  return existsSync(file) ? (JSON.parse(await readFile(file, 'utf8')) as T) : fallback;
}

export async function writeJsonFile(file: string, data: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}

export async function loadItemIds(): Promise<string[]> {
  const fromEnv = (process.env.PLUGGY_ITEM_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([...(await readJsonFile<string[]>(DATA_FILE, [])), ...fromEnv])];
}

export const saveItemIds = (ids: string[]) => writeJsonFile(DATA_FILE, [...new Set(ids)]);
