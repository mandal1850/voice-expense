import { getUser, unauthorized } from "@/lib/auth";
import { addMonths, daysInMonth, isValidMonth, todayIST } from "@/lib/dates";
import { query } from "@/lib/db";
import { applyRecurring } from "@/lib/expenses";

const rupees = (v: unknown) => Number(v || 0) / 100;

// GET /api/summary?month=2026-11 — everything the Month and Trends screens need
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized();
  await applyRecurring(user.id);

  const today = todayIST();
  const thisMonth = today.slice(0, 7);
  const asked = new URL(req.url).searchParams.get("month");
  const month = isValidMonth(asked) ? asked : thisMonth;
  const prev = addMonths(month, -1);
  const uid = user.id;
  const like = month + "%";

  const [totals, byCategory, prevByCategory, byDay, topItems, biggest, byMode, trend, catTrend, budgets, review, first] =
    await Promise.all([
      query("SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS n FROM expenses WHERE user_id = ? AND spent_on LIKE ?", [uid, like]),
      query("SELECT category, SUM(amount) AS total, COUNT(*) AS n FROM expenses WHERE user_id = ? AND spent_on LIKE ? GROUP BY category ORDER BY total DESC", [uid, like]),
      query("SELECT category, SUM(amount) AS total FROM expenses WHERE user_id = ? AND spent_on LIKE ? GROUP BY category", [uid, prev + "%"]),
      query("SELECT spent_on, SUM(amount) AS total FROM expenses WHERE user_id = ? AND spent_on LIKE ? GROUP BY spent_on", [uid, like]),
      query("SELECT MIN(item) AS item, SUM(amount) AS total, COUNT(*) AS n FROM expenses WHERE user_id = ? AND spent_on LIKE ? AND amount > 0 GROUP BY LOWER(item) ORDER BY n DESC, total DESC LIMIT 8", [uid, like]),
      query("SELECT id, item, amount, category, spent_on FROM expenses WHERE user_id = ? AND spent_on LIKE ? ORDER BY amount DESC LIMIT 5", [uid, like]),
      query("SELECT payment_mode, SUM(amount) AS total FROM expenses WHERE user_id = ? AND spent_on LIKE ? GROUP BY payment_mode ORDER BY total DESC", [uid, like]),
      query("SELECT SUBSTR(spent_on,1,7) AS month, SUM(amount) AS total FROM expenses WHERE user_id = ? AND spent_on >= ? AND spent_on < ? GROUP BY month", [uid, addMonths(month, -11) + "-01", addMonths(month, 1) + "-01"]),
      query("SELECT SUBSTR(spent_on,1,7) AS month, category, SUM(amount) AS total FROM expenses WHERE user_id = ? AND spent_on >= ? AND spent_on < ? GROUP BY month, category", [uid, addMonths(month, -5) + "-01", addMonths(month, 1) + "-01"]),
      query("SELECT category, amount FROM budgets WHERE user_id = ?", [uid]),
      query("SELECT COUNT(*) AS n FROM expenses WHERE user_id = ? AND amount = 0", [uid]),
      query("SELECT MIN(spent_on) AS first FROM expenses WHERE user_id = ?", [uid]),
    ]);

  const total = rupees(totals[0].total);
  const prevMap = new Map(prevByCategory.map((r) => [String(r.category), rupees(r.total)]));
  const prevTotal = [...prevMap.values()].reduce((a, b) => a + b, 0);
  const days = daysInMonth(month);
  const elapsed = month === thisMonth ? parseInt(today.slice(8, 10)) : month < thisMonth ? days : 0;

  const dayMap = new Map(byDay.map((r) => [String(r.spent_on), rupees(r.total)]));
  const trendMap = new Map(trend.map((r) => [String(r.month), rupees(r.total)]));
  const spentByCategory = new Map(byCategory.map((r) => [String(r.category), rupees(r.total)]));

  return Response.json({
    month,
    thisMonth,
    firstMonth: first[0].first ? String(first[0].first).slice(0, 7) : thisMonth,
    total,
    count: Number(totals[0].n),
    prevTotal,
    dailyAverage: elapsed ? total / elapsed : 0,
    projection: month === thisMonth && elapsed ? (total / elapsed) * days : null,
    needsReview: Number(review[0].n),
    byCategory: byCategory.map((r) => ({
      category: String(r.category),
      total: rupees(r.total),
      count: Number(r.n),
      prev: prevMap.get(String(r.category)) ?? 0,
    })),
    byDay: Array.from({ length: days }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, "0")}`;
      return { date, total: dayMap.get(date) ?? 0 };
    }),
    topItems: topItems.map((r) => ({ item: String(r.item), total: rupees(r.total), count: Number(r.n) })),
    biggest: biggest.map((r) => ({
      id: Number(r.id), item: String(r.item), amount: rupees(r.amount), category: String(r.category), spentOn: String(r.spent_on),
    })),
    byMode: byMode.map((r) => ({ mode: String(r.payment_mode) || "Not said", total: rupees(r.total) })),
    trend: Array.from({ length: 12 }, (_, i) => {
      const m = addMonths(month, i - 11);
      return { month: m, total: trendMap.get(m) ?? 0 };
    }),
    categoryTrend: catTrend.map((r) => ({ month: String(r.month), category: String(r.category), total: rupees(r.total) })),
    budgets: budgets.map((r) => {
      const category = String(r.category);
      return { category, amount: rupees(r.amount), spent: category ? spentByCategory.get(category) ?? 0 : total };
    }),
  });
}
