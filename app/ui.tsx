"use client";

import { useState } from "react";

export async function api<T = unknown>(url: string, body?: unknown, method?: string): Promise<T> {
  const res = await fetch(url, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Please try again."), { status: res.status });
  return data as T;
}

export function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: n % 1 === 0 || n >= 100 ? 0 : 2 });
}

/** "2026-11" → "Nov 2026" (or "November 2026" when long) */
export function monthLabel(month: string, long = false): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
    month: long ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function HBar({ label, value, note, fraction, over, onClick }: {
  label: string;
  value: string;
  note?: string;
  fraction: number;
  over?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="row">
        <span>{label}</span>
        <b className="num">{value}</b>
      </div>
      <div className={"track" + (over ? " over" : "")}>
        <i style={{ width: `${Math.max(2, Math.min(100, fraction * 100))}%` }} />
      </div>
      {note && <small>{note}</small>}
    </>
  );
  return onClick ? <button className="hbar" onClick={onClick}>{body}</button> : <div className="hbar">{body}</div>;
}

type Point = { key: string; value: number; label: string };

/** Single-series bar chart. Tap or hover a bar to read its value above the plot. */
export function Chart({ data, axis, initial, action }: {
  data: Point[];
  axis: string[];
  initial?: string;
  action?: { label: string; run: (key: string) => void };
}) {
  const [picked, setPicked] = useState<string | null>(initial ?? null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  const current = data.find((d) => d.key === picked) ?? peak;
  const isPeak = current.key === peak.key && peak.value > 0;

  return (
    <div>
      <div className="chart-readout">
        <span>{current.label}{isPeak ? " · highest" : ""}</span>
        <span>
          <b className="num">{inr(current.value)}</b>
          {action && current.value > 0 && (
            <button className="link" style={{ marginLeft: 10 }} onClick={() => action.run(current.key)}>{action.label} ›</button>
          )}
        </span>
      </div>
      <div className="chart" role="group" aria-label="Bar chart">
        {data.map((d) => (
          <button
            key={d.key}
            className={d.key === current.key ? "on" : ""}
            aria-label={`${d.label}: ${inr(d.value)}`}
            onClick={() => setPicked(d.key)}
            onMouseEnter={() => setPicked(d.key)}
          >
            <i style={{ height: d.value ? `${Math.max(3, (d.value / max) * 100)}%` : 0 }} />
          </button>
        ))}
      </div>
      <div className="chart-axis">{axis.map((a, i) => <span key={i}>{a}</span>)}</div>
    </div>
  );
}
