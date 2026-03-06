import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { loadConfig } from "../config.js";

const DATA_DIR = join(homedir(), ".local", "share", "clipx");
const DB_PATH = join(DATA_DIR, "history.db");

export interface HistoryEntry {
  id: number;
  content: string;
  type: string;
  language: string | null;
  confidence: number;
  length: number;
  preview: string;
  created_at: string;
}

export interface QueryOptions {
  limit?: number;
  type?: string;
  since?: string; // e.g. "1h", "30m", "2d"
  search?: string;
}

function parseSince(since: string): Date {
  const match = since.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) throw new Error(`Invalid time filter: "${since}". Use e.g. 1h, 30m, 2d`);
  const [, amountStr, unit] = match;
  const amount = parseInt(amountStr, 10);
  const now = Date.now();
  const ms: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return new Date(now - amount * ms[unit]);
}

let _db: Database | null = null;

export function getDb(dbPath: string = DB_PATH): Database {
  if (_db) return _db;

  const dir = join(dbPath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      language TEXT,
      confidence REAL NOT NULL,
      length INTEGER NOT NULL,
      preview TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_history_type ON history(type);
    CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at);
    CREATE INDEX IF NOT EXISTS idx_history_content_hash ON history(content_hash);
  `);

  _db = db;
  return db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function contentHash(content: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(content);
  return hasher.digest("hex");
}

function makePreview(content: string, maxLen = 100): string {
  const oneLine = content.replace(/\n/g, "\\n");
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + "..." : oneLine;
}

export interface AddEntryInput {
  content: string;
  type: string;
  language?: string | null;
  confidence: number;
}

export function shouldExcludeType(type: string): boolean {
  const config = loadConfig();
  return config.history.excludeTypes.includes(type);
}

export function addEntry(input: AddEntryInput, dbPath?: string): HistoryEntry {
  const db = getDb(dbPath);
  const hash = contentHash(input.content);

  // Skip duplicate if the last entry has the same hash
  const last = db.query<{ content_hash: string }, []>(
    "SELECT content_hash FROM history ORDER BY id DESC LIMIT 1"
  ).get();
  if (last && last.content_hash === hash) {
    // Return existing instead of inserting duplicate
    return db.query<HistoryEntry, []>(
      "SELECT * FROM history ORDER BY id DESC LIMIT 1"
    ).get()!;
  }

  const preview = makePreview(input.content);
  const stmt = db.query<HistoryEntry, [string, string, string, string | null, number, number, string]>(
    `INSERT INTO history (content, content_hash, type, language, confidence, length, preview)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  );

  return stmt.get(
    input.content,
    hash,
    input.type,
    input.language ?? null,
    input.confidence,
    input.content.length,
    preview
  )!;
}

export function query(opts: QueryOptions = {}, dbPath?: string): HistoryEntry[] {
  const db = getDb(dbPath);
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (opts.type) {
    conditions.push("type = ?");
    params.push(opts.type);
  }

  if (opts.since) {
    const sinceDate = parseSince(opts.since);
    conditions.push("created_at >= ?");
    params.push(sinceDate.toISOString());
  }

  if (opts.search) {
    conditions.push("content LIKE ?");
    params.push(`%${opts.search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts.limit ?? 20;

  const sql = `SELECT * FROM history ${where} ORDER BY id DESC LIMIT ?`;
  params.push(limit);

  const stmt = db.query<HistoryEntry, (string | number)[]>(sql);
  return stmt.all(...params);
}

export function prune(maxEntries: number = 1000, dbPath?: string): number {
  const db = getDb(dbPath);

  const countResult = db.query<{ cnt: number }, []>("SELECT COUNT(*) as cnt FROM history").get();
  const count = countResult?.cnt ?? 0;

  if (count <= maxEntries) return 0;

  const toDelete = count - maxEntries;
  db.exec(`DELETE FROM history WHERE id IN (SELECT id FROM history ORDER BY id ASC LIMIT ${toDelete})`);
  return toDelete;
}

export function getLastHash(dbPath?: string): string | null {
  const db = getDb(dbPath);
  const row = db.query<{ content_hash: string }, []>(
    "SELECT content_hash FROM history ORDER BY id DESC LIMIT 1"
  ).get();
  return row?.content_hash ?? null;
}

export function clearHistory(dbPath?: string): void {
  const db = getDb(dbPath);
  db.exec("DELETE FROM history");
}
