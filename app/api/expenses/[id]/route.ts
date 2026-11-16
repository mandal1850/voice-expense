import { bad, getUser, unauthorized } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { query, run } from "@/lib/db";
import { CATEGORIES, ruleKey } from "@/lib/keywords";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const id = Number((await ctx.params).id);
  const rows = await query("SELECT * FROM expenses WHERE id = ? AND user_id = ?", [id, user.id]);
  if (!rows[0]) return bad("Expense not found.", 404);
  const body = await req.json().catch(() => ({}));

  const amount = Number(body.amount);
  const item = String(body.item || "").trim().slice(0, 200);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e8) return bad("Enter a valid amount.");
  if (!item) return bad("Enter what the expense was for.");
  if (!CATEGORIES.includes(body.category)) return bad("Pick a category.");
  if (!isValidDate(body.spentOn)) return bad("Pick a valid date.");

  await run(
    "UPDATE expenses SET amount = ?, item = ?, category = ?, payment_mode = ?, spent_on = ? WHERE id = ? AND user_id = ?",
    [Math.round(amount * 100), item, body.category, String(body.paymentMode || "").slice(0, 20), body.spentOn, id, user.id],
  );

  // Remember a category correction so the same item is filed correctly next time.
  if (body.category !== rows[0].category && ruleKey(item)) {
    await run(
      "INSERT INTO rules (user_id, keyword, category) VALUES (?, ?, ?) ON CONFLICT (user_id, keyword) DO UPDATE SET category = excluded.category",
      [user.id, ruleKey(item), body.category],
    );
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const id = Number((await ctx.params).id);
  const r = await run("DELETE FROM expenses WHERE id = ? AND user_id = ?", [id, user.id]);
  return r.changes ? Response.json({ ok: true }) : bad("Expense not found.", 404);
}
