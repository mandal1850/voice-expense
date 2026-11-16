import { bad, getUser, unauthorized } from "@/lib/auth";
import { isValidDate, isValidMonth, todayIST } from "@/lib/dates";
import { query } from "@/lib/db";
import { insertExpense, logText, toExpense } from "@/lib/expenses";
import { CATEGORIES } from "@/lib/keywords";

// GET /api/expenses?month=2026-11&category=Food&q=chai&review=1
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const p = new URL(req.url).searchParams;
  const where = ["user_id = ?"];
  const args: (string | number)[] = [user.id];
  const month = p.get("month");
  if (isValidMonth(month)) {
    where.push("spent_on LIKE ?");
    args.push(month + "%");
  }
  if (p.get("category")) {
    where.push("category = ?");
    args.push(p.get("category")!);
  }
  if (p.get("q")) {
    where.push("(item LIKE ? OR raw_text LIKE ?)");
    const like = "%" + p.get("q")!.replace(/[%_]/g, "") + "%";
    args.push(like, like);
  }
  if (p.get("review")) where.push("amount = 0");
  const rows = await query(
    `SELECT * FROM expenses WHERE ${where.join(" AND ")} ORDER BY spent_on DESC, id DESC LIMIT 1000`,
    args,
  );
  return Response.json({ expenses: rows.map(toExpense) });
}

// POST { text } for a quick sentence, or { amount, item, category, spentOn, paymentMode } for the form
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));

  if (typeof body.text === "string") {
    const said = body.text.trim().slice(0, 2000);
    if (!said) return bad("Type something like “50 for chai”.");
    return Response.json(await logText(user.id, said, "app"));
  }

  const amount = Number(body.amount);
  const item = String(body.item || "").trim();
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e8) return bad("Enter a valid amount.");
  if (!item) return bad("Enter what the expense was for.");
  const category = CATEGORIES.includes(body.category) ? body.category : "Other";
  const id = await insertExpense(
    user.id,
    {
      amountPaise: Math.round(amount * 100),
      item,
      category,
      paymentMode: String(body.paymentMode || "").slice(0, 20),
      spentOn: isValidDate(body.spentOn) ? body.spentOn : todayIST(),
      rawText: "",
    },
    "app",
  );
  return Response.json({ id });
}
