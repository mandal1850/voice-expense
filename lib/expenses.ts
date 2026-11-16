import { query, run } from "./db";
import { daysInMonth, todayIST } from "./dates";
import { formatRupees, parseExpenses, type ParsedExpense } from "./parse";

export type Expense = {
  id: number;
  amount: number; // rupees
  item: string;
  category: string;
  paymentMode: string;
  spentOn: string;
  rawText: string;
  source: string;
};

export function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: Number(row.id),
    amount: Number(row.amount) / 100,
    item: String(row.item),
    category: String(row.category),
    paymentMode: String(row.payment_mode),
    spentOn: String(row.spent_on),
    rawText: String(row.raw_text),
    source: String(row.source),
  };
}

export async function userRules(userId: number): Promise<Map<string, string>> {
  const rows = await query("SELECT keyword, category FROM rules WHERE user_id = ?", [userId]);
  return new Map(rows.map((r) => [String(r.keyword), String(r.category)]));
}

export async function insertExpense(userId: number, e: ParsedExpense, source: string): Promise<number> {
  const r = await run(
    `INSERT INTO expenses (user_id, amount, item, category, payment_mode, spent_on, raw_text, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, e.amountPaise, e.item.slice(0, 200), e.category, e.paymentMode, e.spentOn, e.rawText.slice(0, 500), source],
  );
  return r.id;
}

/** Parses a spoken or typed sentence and saves every expense in it. Returns a human reply. */
export async function logText(userId: number, text: string, source: string): Promise<{ message: string; saved: number }> {
  const parsed = parseExpenses(text, await userRules(userId));
  if (parsed.length === 0) return { message: "I didn't hear anything. Nothing was saved.", saved: 0 };
  for (const e of parsed) await insertExpense(userId, e, source);

  const good = parsed.filter((e) => e.amountPaise > 0);
  const unclear = parsed.length - good.length;
  const parts: string[] = [];
  if (good.length === 1) {
    const e = good[0];
    const when = e.spentOn === todayIST() ? "" : ` on ${e.spentOn}`;
    parts.push(`Added ${formatRupees(e.amountPaise)} for ${e.item} (${e.category})${when}.`);
  } else if (good.length > 1) {
    parts.push(
      `Added ${good.length} expenses: ` +
        good.map((e) => `${formatRupees(e.amountPaise)} ${e.item}`).join(", ") + ".",
    );
  }
  if (unclear) {
    parts.push(
      `I couldn't find an amount in "${parsed.find((e) => e.amountPaise === 0)!.rawText}". ` +
        `It is saved in the app under Needs review.`,
    );
  }
  if (good.length) {
    const month = todayIST().slice(0, 7);
    const rows = await query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND spent_on LIKE ?",
      [userId, month + "%"],
    );
    parts.push(`This month: ${formatRupees(Number(rows[0].total))}.`);
  }
  return { message: parts.join(" "), saved: parsed.length };
}

export async function undoLast(userId: number): Promise<string> {
  const rows = await query("SELECT * FROM expenses WHERE user_id = ? ORDER BY id DESC LIMIT 1", [userId]);
  if (!rows[0]) return "There is nothing to undo.";
  await run("DELETE FROM expenses WHERE id = ? AND user_id = ?", [rows[0].id, userId]);
  return `Removed ${formatRupees(Number(rows[0].amount))} for ${rows[0].item}.`;
}

/** Adds this month's recurring expenses (rent, subscriptions) once their day has arrived. */
export async function applyRecurring(userId: number): Promise<void> {
  const today = todayIST();
  const month = today.slice(0, 7);
  const day = parseInt(today.slice(8, 10));
  const due = await query("SELECT * FROM recurring WHERE user_id = ? AND last_added_month < ?", [userId, month]);
  for (const r of due) {
    const dueDay = Math.min(Number(r.day_of_month), daysInMonth(month));
    if (day < dueDay) continue;
    // claim the month first so two simultaneous requests cannot both add it
    const claimed = await run("UPDATE recurring SET last_added_month = ? WHERE id = ? AND last_added_month < ?", [
      month, r.id, month,
    ]);
    if (!claimed.changes) continue;
    await run(
      `INSERT INTO expenses (user_id, amount, item, category, spent_on, raw_text, source)
       VALUES (?, ?, ?, ?, ?, ?, 'recurring')`,
      [userId, r.amount, r.item, r.category, `${month}-${String(dueDay).padStart(2, "0")}`, "Recurring: " + r.item],
    );
  }
}
