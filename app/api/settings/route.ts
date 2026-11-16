import { bad, getUser, hashPassword, newShortcutCode, unauthorized, verifyPassword } from "@/lib/auth";
import { query, run } from "@/lib/db";
import { CATEGORIES } from "@/lib/keywords";

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const [budgets, recurring] = await Promise.all([
    query("SELECT category, amount FROM budgets WHERE user_id = ? ORDER BY category", [user.id]),
    query("SELECT id, item, amount, category, day_of_month FROM recurring WHERE user_id = ? ORDER BY day_of_month", [user.id]),
  ]);
  return Response.json({
    user: { name: user.name, username: user.username, shortcutCode: user.shortcutCode },
    categories: CATEGORIES,
    shortcutUrl: process.env.SHORTCUT_URL || "",
    budgets: budgets.map((b) => ({ category: String(b.category), amount: Number(b.amount) / 100 })),
    recurring: recurring.map((r) => ({
      id: Number(r.id), item: String(r.item), amount: Number(r.amount) / 100, category: String(r.category), day: Number(r.day_of_month),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    case "setBudget": {
      // category "" is the overall monthly budget; amount 0 removes it
      const category = String(body.category || "");
      if (category && !CATEGORIES.includes(category as never)) return bad("Pick a category.");
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0 || amount > 1e8) return bad("Enter a valid amount.");
      if (amount === 0) await run("DELETE FROM budgets WHERE user_id = ? AND category = ?", [user.id, category]);
      else
        await run(
          "INSERT INTO budgets (user_id, category, amount) VALUES (?, ?, ?) ON CONFLICT (user_id, category) DO UPDATE SET amount = excluded.amount",
          [user.id, category, Math.round(amount * 100)],
        );
      return Response.json({ ok: true });
    }
    case "addRecurring": {
      const item = String(body.item || "").trim().slice(0, 100);
      const amount = Number(body.amount);
      const day = Math.round(Number(body.day));
      if (!item) return bad("Enter a name, like Rent.");
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1e8) return bad("Enter a valid amount.");
      if (!(day >= 1 && day <= 31)) return bad("Day must be between 1 and 31.");
      const category = CATEGORIES.includes(body.category) ? body.category : "Other";
      await run("INSERT INTO recurring (user_id, item, amount, category, day_of_month) VALUES (?, ?, ?, ?, ?)", [
        user.id, item, Math.round(amount * 100), category, day,
      ]);
      return Response.json({ ok: true });
    }
    case "deleteRecurring":
      await run("DELETE FROM recurring WHERE id = ? AND user_id = ?", [Number(body.id), user.id]);
      return Response.json({ ok: true });
    case "regenerateCode": {
      const code = newShortcutCode();
      await run("UPDATE users SET shortcut_code = ? WHERE id = ?", [code, user.id]);
      return Response.json({ shortcutCode: code });
    }
    case "changePassword": {
      const rows = await query("SELECT pass_hash FROM users WHERE id = ?", [user.id]);
      if (!verifyPassword(String(body.current || ""), String(rows[0].pass_hash))) return bad("Current password is wrong.");
      if (String(body.next || "").length < 6) return bad("New password must be at least 6 characters.");
      await run("UPDATE users SET pass_hash = ? WHERE id = ?", [hashPassword(String(body.next)), user.id]);
      return Response.json({ ok: true });
    }
  }
  return bad("Unknown action.");
}
