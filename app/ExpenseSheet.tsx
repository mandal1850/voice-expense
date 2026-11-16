"use client";

import { useState } from "react";
import { api } from "./ui";

export type Expense = {
  id: number;
  amount: number;
  item: string;
  category: string;
  paymentMode: string;
  spentOn: string;
  rawText: string;
  source: string;
};

const MODES = ["", "UPI", "Cash", "Card", "Bank"];

function today(): string {
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/** Bottom sheet for adding (quick sentence or full form) and editing an expense. */
export function ExpenseSheet({ expense, categories, onClose, onSaved }: {
  expense: Expense | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quick, setQuick] = useState("");
  const [showForm, setShowForm] = useState(Boolean(expense));
  const [f, setF] = useState({
    amount: expense?.amount ? String(expense.amount) : "",
    item: expense?.item ?? "",
    category: expense?.category ?? "Other",
    paymentMode: expense?.paymentMode ?? "",
    spentOn: expense?.spentOn ?? today(),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const saveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...f, amount: Number(f.amount) };
    act(() => (expense ? api(`/api/expenses/${expense.id}`, body, "PATCH") : api("/api/expenses", body)));
  };

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-label={expense ? "Edit expense" : "Add expense"}>
        <header>
          <h3>{expense ? "Edit expense" : "Add expense"}</h3>
          <button className="iconbtn" aria-label="Close" onClick={onClose}>×</button>
        </header>

        {!expense && !showForm && (
          <form onSubmit={(e) => { e.preventDefault(); act(() => api("/api/expenses", { text: quick })); }}>
            <label htmlFor="quick">Type or dictate it, the same way you would say it</label>
            <input id="quick" autoFocus placeholder="50 for chai and 120 for lunch" value={quick} onChange={(e) => setQuick(e.target.value)} />
            {error && <p className="error">{error}</p>}
            <button className="btn primary block" disabled={busy || !quick.trim()}>Add</button>
            <p className="switch" style={{ textAlign: "center", marginTop: 14 }}>
              <button type="button" className="link" onClick={() => { setShowForm(true); setError(""); }}>Fill in a form instead</button>
            </p>
          </form>
        )}

        {showForm && (
          <form onSubmit={saveForm}>
            <div className="grid2">
              <div>
                <label htmlFor="amount">Amount (₹)</label>
                <input id="amount" inputMode="decimal" autoFocus={!expense?.amount} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
              </div>
              <div>
                <label htmlFor="date">Date</label>
                <input id="date" type="date" max={today()} value={f.spentOn} onChange={(e) => setF({ ...f, spentOn: e.target.value })} />
              </div>
            </div>
            <label htmlFor="item">What for</label>
            <input id="item" value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} />
            <div className="grid2">
              <div>
                <label htmlFor="category">Category</label>
                <select id="category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="mode">Paid by</label>
                <select id="mode" value={f.paymentMode} onChange={(e) => setF({ ...f, paymentMode: e.target.value })}>
                  {MODES.map((m) => <option key={m} value={m}>{m || "Not said"}</option>)}
                </select>
              </div>
            </div>
            {expense?.rawText && <p className="said">You said: “{expense.rawText}”</p>}
            {expense && expense.category !== f.category && (
              <p className="said">“{f.item}” will be filed under {f.category} from now on.</p>
            )}
            {error && <p className="error">{error}</p>}
            <div className="btnrow">
              {expense && (
                <button type="button" className="btn danger" disabled={busy}
                  onClick={() => confirm(`Delete “${expense.item}”? This cannot be undone.`) && act(() => api(`/api/expenses/${expense.id}`, undefined, "DELETE"))}>
                  Delete
                </button>
              )}
              <button className="btn primary" disabled={busy}>Save</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
