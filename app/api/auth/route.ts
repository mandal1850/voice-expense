import { bad, createSession, destroySession, hashPassword, newShortcutCode, sessionCookie, verifyPassword } from "@/lib/auth";
import { query, run } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "logout") {
    await destroySession(req);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie("", 0) } });
  }

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (action === "signup") {
    const name = String(body.name || "").trim().slice(0, 40);
    const invite = process.env.SIGNUP_CODE;
    if (invite && String(body.invite || "").trim() !== invite) return bad("That invite code is not right.");
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) return bad("Username must be 3–20 letters, numbers, dots or underscores.");
    if (password.length < 6) return bad("Password must be at least 6 characters.");
    if (!name) return bad("Please enter your name.");
    const existing = await query("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length) return bad("That username is taken.");
    const { id } = await run("INSERT INTO users (username, name, pass_hash, shortcut_code) VALUES (?, ?, ?, ?)", [
      username, name, hashPassword(password), newShortcutCode(),
    ]);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": await createSession(id) } });
  }

  if (action === "login") {
    const rows = await query("SELECT id, pass_hash FROM users WHERE username = ?", [username]);
    if (!rows[0] || !verifyPassword(password, String(rows[0].pass_hash))) return bad("Wrong username or password.", 401);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": await createSession(Number(rows[0].id)) } });
  }

  return bad("Unknown action.");
}
