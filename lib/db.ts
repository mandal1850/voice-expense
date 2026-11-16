import { createClient, type Client, type InArgs, type Row } from "@libsql/client";

// Locally this is a SQLite file in the project folder. In production set
// TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (see SETUP.md).
let client: Client | null = null;
let ready: Promise<void> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    pass_hash TEXT NOT NULL,
    shortcut_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    item TEXT NOT NULL,
    category TEXT NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT '',
    spent_on TEXT NOT NULL,
    raw_text TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'app',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS expenses_user_date ON expenses (user_id, spent_on)`,
  `CREATE TABLE IF NOT EXISTS rules (
    user_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    category TEXT NOT NULL,
    PRIMARY KEY (user_id, keyword)
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    PRIMARY KEY (user_id, category)
  )`,
  `CREATE TABLE IF NOT EXISTS recurring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    day_of_month INTEGER NOT NULL,
    last_added_month TEXT NOT NULL DEFAULT ''
  )`,
];

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

async function ensureReady(): Promise<Client> {
  const c = getClient();
  if (!ready) {
    ready = c.batch(SCHEMA, "write").then(() => undefined);
    ready.catch(() => (ready = null));
  }
  await ready;
  return c;
}

export async function query(sql: string, args: InArgs = []): Promise<Row[]> {
  const c = await ensureReady();
  return (await c.execute({ sql, args })).rows;
}

export async function run(sql: string, args: InArgs = []): Promise<{ changes: number; id: number }> {
  const c = await ensureReady();
  const r = await c.execute({ sql, args });
  return { changes: r.rowsAffected, id: Number(r.lastInsertRowid ?? 0) };
}
