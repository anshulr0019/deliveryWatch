"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CheckPoint } from "./DomainDetail";

type Range = 7 | 30 | 90;

export function ScoreHistoryChart({ history }: { history: CheckPoint[] }) {
  const [range, setRange] = useState<Range>(30);

  const data = useMemo(() => {
    const since = Date.now() - range * 24 * 3600 * 1000;
    const filtered = history.filter((p) => new Date(p.t).getTime() >= since);
    return (filtered.length ? filtered : history.slice(-1)).map((p) => ({ ...p, ts: new Date(p.t).getTime() }));
  }, [history, range]);

  const min = data.length ? Math.min(...data.map((d) => d.score)) : 0;
  const max = data.length ? Math.max(...data.map((d) => d.score)) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-[#0B1311]">Score history</h3>
          <p className="text-xs text-slate-500">
            {data.length} snapshot{data.length === 1 ? "" : "s"} · low {min} · high {max}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 text-xs">
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 font-semibold transition ${range === r ? "bg-white text-[#0F372E] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="emeraldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(v: number) => format(new Date(v), range === 7 ? "EEE HH:mm" : "MMM d")}
              stroke="#CBD5E1"
              tick={{ fill: "#64748B", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis domain={[0, 100]} stroke="#CBD5E1" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} ticks={[0, 25, 50, 75, 100]} />
            <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: "rgba(16,185,129,0.4)" }}
              contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 12, color: "#0F172A", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              labelStyle={{ color: "#64748B", marginBottom: 4 }}
              labelFormatter={(v) => format(new Date(Number(v)), "PPpp")}
              formatter={(value) => [`${value}/100`, "Score"]}
            />
            <Area type="monotone" dataKey="score" stroke="#0F372E" strokeWidth={2.5} fill="url(#emeraldFill)" dot={data.length < 40 ? { r: 3, fill: "#10B981", stroke: "#FFFFFF", strokeWidth: 2 } : false} activeDot={{ r: 5, fill: "#0F372E" }} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
