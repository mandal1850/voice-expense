"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, Chart, HBar, inr, monthLabel, shiftMonth } from "./ui";
import { ExpenseSheet, type Expense } from "./ExpenseSheet";
import { Settings, type SettingsData } from "./Settings";

type Summary = {
  month: string;
  thisMonth: string;
  firstMonth: string;
  total: number;
  count: number;
  prevTotal: number;
  dailyAverage: number;
  projection: number | null;
  needsReview: number;
  byCategory: { category: string; total: number; count: number; prev: number }[];
  byDay: { date: string; total: number }[];
  topItems: { item: string; total: number; count: number }[];
  biggest: { id: number; item: string; amount: number; category: string; spentOn: string }[];
  byMode: { mode: string; total: number }[];
  trend: { month: string; total: number }[];
  categoryTrend: { month: string; category: string; total: number }[];
  budgets: { category: string; amount: number; spent: number }[];
};

type Tab = "month" | "expenses" | "trends" | "settings";

export default function App() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [state, setState] = useState<"loading" | "auth" | "ready">("loading");
  const [tab, setTab] = useState<Tab>("month");
  const [month, setMonth] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState({ q: "", category: "", review: false });
  const [sheet, setSheet] = useState<Expense | "new" | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await api<SettingsData>("/api/settings"));
      setState("ready");
    } catch {
      setState("auth");
    }
  }, []);
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (state !== "ready") return;
    let stale = false;
    api<Summary>("/api/summary" + (month ? `?month=${month}` : ""))
      .then((s) => {
        if (stale) return;
        setSummary(s);
        if (!month) setMonth(s.month);
      })
      .catch((e) => e.status === 401 && setState("auth"));
    return () => {
      stale = true;
    };
  }, [state, month, version]);

  useEffect(() => {
    if (state !== "ready" || !month || tab !== "expenses") return;
    let stale = false;
    const p = new URLSearchParams();
    // searching and the review list look across every month
    if (filter.review) p.set("review", "1");
    else if (!filter.q) p.set("month", month);
    if (filter.q) p.set("q", filter.q);
    if (filter.category) p.set("category", filter.category);
    const t = setTimeout(() => {
      api<{ expenses: Expense[] }>("/api/expenses?" + p).then((r) => !stale && setExpenses(r.expenses)).catch(() => {});
    }, filter.q ? 250 : 0);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [state, month, tab, filter, version]);

  // refresh when the app comes back to the foreground, e.g. after using the shortcut
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (state === "loading") return <div className="empty">Loading…</div>;
  if (state === "auth") return <Auth onDone={loadSettings} />;
  if (!settings) return null;

  const showMonthNav = tab === "month" || (tab === "expenses" && !filter.q && !filter.review) || tab === "trends";
  const openExpenses = (f: Partial<typeof filter>) => {
    setFilter({ q: "", category: "", review: false, ...f });
    setTab("expenses");
  };

  return (
    <div className="app">
      <div className="topbar">
        <h1>{tab === "month" ? "Overview" : tab === "expenses" ? "Expenses" : tab === "trends" ? "Trends" : "Settings"}</h1>
        {showMonthNav && summary && month && (
          <div className="monthnav">
            <button className="iconbtn" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
            <span>{monthLabel(month)}</span>
            <button className="iconbtn" aria-label="Next month" disabled={month >= summary.thisMonth} onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
          </div>
        )}
      </div>

      {tab === "month" && (summary ? <MonthView s={summary} openExpenses={openExpenses} /> : <div className="empty">Loading…</div>)}
      {tab === "expenses" && (
        <ExpensesView expenses={expenses} filter={filter} setFilter={setFilter} categories={settings.categories} onOpen={setSheet} />
      )}
      {tab === "trends" && summary && <TrendsView s={summary} categories={settings.categories} onPickMonth={(m) => { setMonth(m); setTab("month"); }} />}
      {tab === "settings" && <Settings data={settings} reload={loadSettings} refresh={refresh} onLogout={() => { setSummary(null); setMonth(""); setState("auth"); }} />}

      {tab !== "settings" && <button className="fab" aria-label="Add expense" onClick={() => setSheet("new")}>+</button>}

      <nav className="tabs">
        <div>
          {(["month", "expenses", "trends", "settings"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {t === "month" ? "Month" : t === "expenses" ? "Expenses" : t === "trends" ? "Trends" : "Settings"}
            </button>
          ))}
        </div>
      </nav>

      {sheet && (
        <ExpenseSheet
          expense={sheet === "new" ? null : sheet}
          categories={settings.categories}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); refresh(); }}
        />
      )}
    </div>
  );
}

function Auth({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [f, setF] = useState({ name: "", username: "", password: "", invite: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth", { action: mode, ...f });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth" onSubmit={submit}>
      <h1>Voice Expense</h1>
      <p className="muted">Say “50 rupees for chai” and it is logged.</p>
      {mode === "signup" && (
        <>
          <label htmlFor="name">Your name</label>
          <input id="name" value={f.name} onChange={set("name")} autoComplete="name" required />
        </>
      )}
      <label htmlFor="username">Username</label>
      <input id="username" value={f.username} onChange={set("username")} autoCapitalize="none" autoCorrect="off" autoComplete="username" required />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
      {mode === "signup" && (
        <>
          <label htmlFor="invite">Invite code (if you were given one)</label>
          <input id="invite" value={f.invite} onChange={set("invite")} autoCapitalize="none" autoCorrect="off" />
        </>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn primary block" disabled={busy}>{mode === "login" ? "Log in" : "Create account"}</button>
      <p className="switch">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </form>
  );
}

function MonthView({ s, openExpenses }: { s: Summary; openExpenses: (f: { category?: string; review?: boolean }) => void }) {
  const diff = s.total - s.prevTotal;
  const pct = s.prevTotal ? Math.round((Math.abs(diff) / s.prevTotal) * 100) : null;
  const max = Math.max(...s.byCategory.map((c) => c.total), 1);
  const isCurrent = s.month === s.thisMonth;

  return (
    <>
      {s.needsReview > 0 && (
        <button className="banner" onClick={() => openExpenses({ review: true })}>
          <span>{s.needsReview} {s.needsReview === 1 ? "entry needs" : "entries need"} an amount</span>
          <span>Review ›</span>
        </button>
      )}

      <div className="card hero">
        <div className="label">Spent in {monthLabel(s.month, true)}</div>
        <div className="total num">{inr(s.total)}</div>
        <div className="delta">
          {s.prevTotal === 0 ? "No spending recorded the month before" : diff === 0 ? "Same as the month before" : (
            <>
              <span className={diff > 0 ? "up" : "down"}>{diff > 0 ? "▲" : "▼"} {inr(Math.abs(diff))}{pct !== null && ` (${pct}%)`}</span>
              {diff > 0 ? " more" : " less"} than {monthLabel(shiftMonth(s.month, -1), true)}
            </>
          )}
        </div>
        <div className="stats">
          <div><span>Entries</span><b className="num">{s.count}</b></div>
          <div><span>Daily average</span><b className="num">{inr(s.dailyAverage)}</b></div>
          <div><span>{isCurrent ? "On pace for" : "Biggest day"}</span><b className="num">{inr(isCurrent ? s.projection ?? 0 : Math.max(...s.byDay.map((d) => d.total), 0))}</b></div>
        </div>
      </div>

      {s.count === 0 ? (
        <div className="card empty">Nothing logged in {monthLabel(s.month, true)}.<br />Use your shortcut, or tap + to add an expense.</div>
      ) : (
        <>
          {s.budgets.length > 0 && (
            <div className="card">
              <h2>Budgets</h2>
              {s.budgets.map((b) => {
                const over = b.spent > b.amount;
                return (
                  <HBar key={b.category} label={b.category || "Overall"} fraction={b.spent / b.amount} over={over}
                    value={`${inr(b.spent)} of ${inr(b.amount)}`}
                    note={over ? `${inr(b.spent - b.amount)} over` : `${inr(b.amount - b.spent)} left`} />
                );
              })}
            </div>
          )}

          <div className="card">
            <h2>By category</h2>
            {s.byCategory.map((c) => {
              const d = c.total - c.prev;
              return (
                <HBar key={c.category} label={c.category} fraction={c.total / max} value={inr(c.total)}
                  note={`${Math.round((c.total / s.total) * 100)}% · ${c.prev ? `${d >= 0 ? "▲" : "▼"} ${inr(Math.abs(d))} vs last month` : "new this month"}`}
                  onClick={() => openExpenses({ category: c.category })} />
              );
            })}
          </div>

          <div className="card">
            <h2>Day by day</h2>
            <Chart
              data={s.byDay.map((d) => ({ key: d.date, value: d.total, label: `${parseInt(d.date.slice(8))} ${monthLabel(s.month, true).split(" ")[0]}` }))}
              axis={["1", String(Math.ceil(s.byDay.length / 2)), String(s.byDay.length)]}
            />
          </div>

          <div className="card">
            <h2>Most frequent</h2>
            <ul className="list">
              {s.topItems.map((t) => (
                <li key={t.item}>
                  <div className="item">
                    <div className="what"><b>{t.item}</b><span>{t.count} {t.count === 1 ? "time" : "times"}</span></div>
                    <div className="amt num">{inr(t.total)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Biggest expenses</h2>
            <ul className="list">
              {s.biggest.map((b) => (
                <li key={b.id}>
                  <div className="item">
                    <div className="what"><b>{b.item}</b><span>{b.category} · {dayLabel(b.spentOn)}</span></div>
                    <div className="amt num">{inr(b.amount)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {s.byMode.some((m) => m.mode !== "Not said") && (
            <div className="card">
              <h2>How you paid</h2>
              {s.byMode.map((m) => (
                <div className="rowline" key={m.mode}><span>{m.mode}</span><b className="num">{inr(m.total)}</b></div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function dayLabel(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function ExpensesView({ expenses, filter, setFilter, categories, onOpen }: {
  expenses: Expense[];
  filter: { q: string; category: string; review: boolean };
  setFilter: (f: { q: string; category: string; review: boolean }) => void;
  categories: string[];
  onOpen: (e: Expense) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) map.set(e.spentOn, [...(map.get(e.spentOn) ?? []), e]);
    return [...map.entries()];
  }, [expenses]);
  const total = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <>
      <div className="filters">
        <input type="search" placeholder="Search all months" aria-label="Search expenses" value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        <select aria-label="Category" style={{ width: 150 }} value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      {filter.review && (
        <button className="banner" onClick={() => setFilter({ ...filter, review: false })}>
          <span>Showing entries that need an amount</span><span>Show all ›</span>
        </button>
      )}
      {expenses.length === 0 ? (
        <div className="card empty">{filter.q || filter.category || filter.review ? "No expenses match." : "Nothing logged this month yet."}</div>
      ) : (
        <>
          <p className="muted num" style={{ margin: "0 4px" }}>{expenses.length} {expenses.length === 1 ? "expense" : "expenses"} · {inr(total)}</p>
          {groups.map(([date, list]) => (
            <div key={date}>
              <div className="dayhead"><span>{dayLabel(date)}</span><span className="num">{inr(list.reduce((a, e) => a + e.amount, 0))}</span></div>
              <div className="card" style={{ padding: "2px 16px" }}>
                <ul className="list">
                  {list.map((e) => (
                    <li key={e.id}>
                      <button className="item" onClick={() => onOpen(e)}>
                        <div className="what">
                          <b>{e.item}</b>
                          <span>{e.category}{e.paymentMode && ` · ${e.paymentMode}`}{e.source === "recurring" && " · recurring"}</span>
                        </div>
                        <div className="amt num">{e.amount ? inr(e.amount) : <span className="up">Add amount</span>}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function TrendsView({ s, categories, onPickMonth }: { s: Summary; categories: string[]; onPickMonth: (m: string) => void }) {
  const [category, setCategory] = useState("");
  const used = categories.filter((c) => s.categoryTrend.some((t) => t.category === c));
  const picked = category || used[0] || "";
  const last6 = s.trend.slice(-6).map((t) => t.month);
  const active = s.trend.filter((t) => t.total > 0);
  const average = active.length ? active.reduce((a, t) => a + t.total, 0) / active.length : 0;

  if (active.length === 0) return <div className="card empty">Trends appear once you have logged some expenses.</div>;

  return (
    <>
      <div className="card">
        <h2>Last 12 months</h2>
        <Chart
          data={s.trend.map((t) => ({ key: t.month, value: t.total, label: monthLabel(t.month, true) }))}
          axis={[monthLabel(s.trend[0].month), monthLabel(s.trend[6].month), monthLabel(s.trend[11].month)]}
          initial={s.month}
          action={{ label: "Open month", run: onPickMonth }}
        />
        <p className="muted" style={{ marginTop: 12 }}>
          Average over {active.length} {active.length === 1 ? "month" : "months"} with spending: <b className="num">{inr(average)}</b>
        </p>
      </div>

      {picked && (
        <div className="card">
          <h2>One category over 6 months</h2>
          <select aria-label="Category" value={picked} onChange={(e) => setCategory(e.target.value)} style={{ marginBottom: 14 }}>
            {used.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Chart
            data={last6.map((m) => ({
              key: m,
              value: s.categoryTrend.find((t) => t.month === m && t.category === picked)?.total ?? 0,
              label: monthLabel(m, true),
            }))}
            axis={[monthLabel(last6[0]), monthLabel(last6[5])]}
            initial={s.month}
          />
        </div>
      )}

      <div className="card">
        <h2>Month by month</h2>
        <ul className="list">
          {[...s.trend].reverse().filter((t) => t.total > 0).map((t) => (
            <li key={t.month}>
              <button className="item" onClick={() => onPickMonth(t.month)}>
                <div className="what"><b>{monthLabel(t.month, true)}</b></div>
                <div className="amt num">{inr(t.total)} ›</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
