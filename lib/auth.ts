import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query, run } from "./db";

export type User = { id: number; username: string; name: string; shortcutCode: string };

const COOKIE = "vx_session";
const SESSION_DAYS = 365;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

/** Personal code pasted into the iOS shortcut. Letters and digits that are hard to misread. */
export function newShortcutCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(24);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function toUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    username: String(row.username),
    name: String(row.name),
    shortcutCode: String(row.shortcut_code),
  };
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  await run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [token, userId, expires]);
  return sessionCookie(token, SESSION_DAYS * 86400);
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function readToken(req: Request): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === COOKIE && v) return v;
  }
  return null;
}

export async function getUser(req: Request): Promise<User | null> {
  const token = readToken(req);
  if (!token) return null;
  const rows = await query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?`,
    [token, Date.now()],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function destroySession(req: Request): Promise<void> {
  const token = readToken(req);
  if (token) await run("DELETE FROM sessions WHERE token = ?", [token]);
}

export async function userFromCode(code: unknown): Promise<User | null> {
  if (typeof code !== "string" || code.trim().length < 16) return null;
  const rows = await query("SELECT * FROM users WHERE shortcut_code = ?", [code.trim().toLowerCase()]);
  return rows[0] ? toUser(rows[0]) : null;
}

export function unauthorized(): Response {
  return Response.json({ error: "Please log in." }, { status: 401 });
}

export function bad(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
