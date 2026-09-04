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
          <h3 className="font-display text-base font-semibold text-white">Score history</h3>
          <p className="text-xs text-muted-2">
            {data.length} snapshot{data.length === 1 ? "" : "s"} · low {min} · high {max}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-white/[0.08] bg-black/40 p-1 text-xs">
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 font-medium transition ${range === r ? "bg-gold/[0.15] text-gold-light ring-1 ring-gold/40" : "text-muted hover:text-white"}`}
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
              <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8A96E" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#C8A96E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(v: number) => format(new Date(v), range === 7 ? "EEE HH:mm" : "MMM d")}
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: "#888", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.15)" tick={{ fill: "#888", fontSize: 11 }} tickLine={false} axisLine={false} ticks={[0, 25, 50, 75, 100]} />
            <ReferenceLine y={70} stroke="rgba(200,169,110,0.25)" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: "rgba(200,169,110,0.4)" }}
              contentStyle={{ background: "#0B0D12", border: "1px solid rgba(200,169,110,0.35)", borderRadius: 12, fontSize: 12, color: "#fff" }}
              labelStyle={{ color: "#94A3B8", marginBottom: 4 }}
              labelFormatter={(v) => format(new Date(Number(v)), "PPpp")}
              formatter={(value) => [`${value}/100`, "Score"]}
            />
            <Area type="monotone" dataKey="score" stroke="#C8A96E" strokeWidth={2.2} fill="url(#goldFill)" dot={data.length < 40 ? { r: 3, fill: "#E8D2A2", stroke: "#0B0D12", strokeWidth: 1.5 } : false} activeDot={{ r: 5, fill: "#E8D2A2" }} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
