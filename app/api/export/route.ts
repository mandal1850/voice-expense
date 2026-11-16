import { getUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";

const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet apps treating text as a formula
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const rows = await query(
    "SELECT spent_on, amount, item, category, payment_mode, raw_text, source FROM expenses WHERE user_id = ? ORDER BY spent_on, id",
    [user.id],
  );
  const lines = ["Date,Amount,Item,Category,Payment mode,What was said,Source"];
  for (const r of rows) {
    lines.push(
      [r.spent_on, Number(r.amount) / 100, r.item, r.category, r.payment_mode, r.raw_text, r.source].map(cell).join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="expenses.csv"',
    },
  });
}
