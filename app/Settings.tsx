"use client";

import { useState } from "react";
import { api, inr } from "./ui";

export type SettingsData = {
  user: { name: string; username: string; shortcutCode: string };
  categories: string[];
  shortcutUrl: string;
  budgets: { category: string; amount: number }[];
  recurring: { id: number; item: string; amount: number; category: string; day: number }[];
};

export function Settings({ data, reload, refresh, onLogout }: {
  data: SettingsData;
  reload: () => Promise<void>;
  refresh: () => void;
  onLogout: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ where: string; text: string; ok: boolean } | null>(null);
  const [budgetCat, setBudgetCat] = useState("");
  const [budgetAmt, setBudgetAmt] = useState("");
  const [rec, setRec] = useState({ item: "", amount: "", day: "1", category: "Rent & Home" });
  const [pw, setPw] = useState({ current: "", next: "" });

  const post = async (where: string, body: unknown, done?: string) => {
    try {
      await api("/api/settings", body);
      await reload();
      refresh();
      setMsg(done ? { where, text: done, ok: true } : null);
      return true;
    } catch (e) {
      setMsg({ where, text: (e as Error).message, ok: false });
      return false;
    }
  };
  const note = (where: string) =>
    msg?.where === where && <p className={msg.ok ? "okmsg" : "error"}>{msg.text}</p>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.user.shortcutCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg({ where: "code", text: "Couldn't copy. Press and hold the code to copy it.", ok: false });
    }
  };

  const overall = data.budgets.find((b) => b.category === "");

  return (
    <>
      <div className="card">
        <h2>Voice shortcut</h2>
        <p className="muted">This is your personal code. The shortcut uses it to save expenses to your account. Keep it private.</p>
        <div className="code">{data.user.shortcutCode}</div>
        <div className="btnrow" style={{ marginTop: 0 }}>
          <button className="btn primary" onClick={copy}>{copied ? "Copied" : "Copy code"}</button>
          {data.shortcutUrl && <a className="btn" style={{ display: "grid", placeItems: "center", textDecoration: "none", flex: 1 }} href={data.shortcutUrl}>Get the shortcut</a>}
        </div>
        {note("code")}
        <ol className="steps">
          <li>Tap <b>Copy code</b>.</li>
          <li>{data.shortcutUrl ? <>Tap <b>Get the shortcut</b>, then <b>Add Shortcut</b>.</> : <>Open the shortcut link you were sent and tap <b>Add Shortcut</b>.</>}</li>
          <li>When it asks for your code, paste it.</li>
          <li>In the Shortcuts app, press and hold the shortcut and choose <b>Add to Home Screen</b>.</li>
          <li>Tap it and say something like “50 rupees for chai”. Say “undo” to remove the last entry.</li>
        </ol>
        <button className="link" style={{ marginTop: 12, fontSize: 14 }}
          onClick={() => confirm("Make a new code? Your current shortcut will stop working until you set it up again with the new code.") && post("code", { action: "regenerateCode" }, "New code created. Set up your shortcut again with it.")}>
          Code leaked? Make a new one
        </button>
      </div>

      <div className="card">
        <h2>Monthly budgets</h2>
        {data.budgets.length === 0 && <p className="muted">No budgets yet. Set an overall limit or one per category.</p>}
        {data.budgets.map((b) => (
          <div className="rowline" key={b.category}>
            <span>{b.category || "Overall"}</span>
            <span><b className="num">{inr(b.amount)}</b>
              <button className="link" style={{ marginLeft: 12 }} aria-label={`Remove ${b.category || "overall"} budget`}
                onClick={() => post("budget", { action: "setBudget", category: b.category, amount: 0 })}>Remove</button>
            </span>
          </div>
        ))}
        <form onSubmit={async (e) => { e.preventDefault(); if (await post("budget", { action: "setBudget", category: budgetCat, amount: Number(budgetAmt) })) setBudgetAmt(""); }}>
          <div className="grid2">
            <div>
              <label htmlFor="bcat">Budget for</label>
              <select id="bcat" value={budgetCat} onChange={(e) => setBudgetCat(e.target.value)}>
                <option value="">Overall{overall ? " (replace)" : ""}</option>
                {data.categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bamt">Amount per month (₹)</label>
              <input id="bamt" inputMode="decimal" value={budgetAmt} onChange={(e) => setBudgetAmt(e.target.value)} />
            </div>
          </div>
          {note("budget")}
          <button className="btn block" disabled={!Number(budgetAmt)}>Set budget</button>
        </form>
      </div>

      <div className="card">
        <h2>Recurring expenses</h2>
        <p className="muted">Added automatically every month on the day you choose.</p>
        {data.recurring.map((r) => (
          <div className="rowline" key={r.id}>
            <span>{r.item} <small className="muted">· day {r.day} · {r.category}</small></span>
            <span><b className="num">{inr(r.amount)}</b>
              <button className="link" style={{ marginLeft: 12 }} aria-label={`Remove ${r.item}`}
                onClick={() => post("rec", { action: "deleteRecurring", id: r.id })}>Remove</button>
            </span>
          </div>
        ))}
        <form onSubmit={async (e) => { e.preventDefault(); if (await post("rec", { action: "addRecurring", ...rec, amount: Number(rec.amount), day: Number(rec.day) })) setRec({ ...rec, item: "", amount: "" }); }}>
          <div className="grid2">
            <div><label htmlFor="ritem">Name</label><input id="ritem" placeholder="Rent" value={rec.item} onChange={(e) => setRec({ ...rec, item: e.target.value })} /></div>
            <div><label htmlFor="ramt">Amount (₹)</label><input id="ramt" inputMode="decimal" value={rec.amount} onChange={(e) => setRec({ ...rec, amount: e.target.value })} /></div>
            <div><label htmlFor="rday">Day of month</label><input id="rday" inputMode="numeric" value={rec.day} onChange={(e) => setRec({ ...rec, day: e.target.value })} /></div>
            <div>
              <label htmlFor="rcat">Category</label>
              <select id="rcat" value={rec.category} onChange={(e) => setRec({ ...rec, category: e.target.value })}>
                {data.categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {note("rec")}
          <button className="btn block" disabled={!rec.item.trim() || !Number(rec.amount)}>Add recurring expense</button>
        </form>
      </div>

      <div className="card">
        <h2>Your data</h2>
        <p className="muted">Download every expense as a spreadsheet file.</p>
        <a className="btn block" style={{ display: "grid", placeItems: "center", textDecoration: "none" }} href="/api/export">Download CSV</a>
      </div>

      <div className="card">
        <h2>Account</h2>
        <p className="muted">Logged in as {data.user.name} (@{data.user.username})</p>
        <form onSubmit={async (e) => { e.preventDefault(); if (await post("pw", { action: "changePassword", ...pw }, "Password changed.")) setPw({ current: "", next: "" }); }}>
          <div className="grid2">
            <div><label htmlFor="pwc">Current password</label><input id="pwc" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
            <div><label htmlFor="pwn">New password</label><input id="pwn" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          </div>
          {note("pw")}
          <button className="btn block" disabled={!pw.current || !pw.next}>Change password</button>
        </form>
        <button className="btn danger block" onClick={async () => { await api("/api/auth", { action: "logout" }); onLogout(); }}>Log out</button>
      </div>
    </>
  );
}
