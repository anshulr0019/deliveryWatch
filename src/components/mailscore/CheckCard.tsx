"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, ShieldCheck, ShieldAlert, ShieldX, Wrench } from "lucide-react";
import { SpotlightCard } from "./SpotlightCard";
import { statusColor, statusLabel } from "@/lib/score-ui";
import type { CheckStatus } from "@/lib/dns-check";

export interface CheckCardProps {
  title: string; // SPF / DKIM / DMARC / MX / RBL
  subtitle: string;
  status: CheckStatus | string;
  score: number;
  maxScore?: number;
  record?: string | null;
  facts?: { label: string; value: string }[];
  issues?: string[];
  suggestions?: string[];
  compact?: boolean;
}

function StatusIcon({ status }: { status: string }) {
  const color = statusColor(status);
  const cls = "h-5 w-5";
  if (status === "pass") return <ShieldCheck className={cls} style={{ color }} />;
  if (status === "warn") return <ShieldAlert className={cls} style={{ color }} />;
  return <ShieldX className={cls} style={{ color }} />;
}

export function CheckCard({ title, subtitle, status, score, maxScore = 20, record, facts = [], issues = [], suggestions = [], compact = false }: CheckCardProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(status !== "pass" && !compact);
  const color = statusColor(status);

  const copy = async () => {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <SpotlightCard className="h-full">
      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
              <StatusIcon status={status} />
            </div>
            <div>
              <div className="font-display text-lg font-semibold text-white">{title}</div>
              <div className="text-xs text-muted-2">{subtitle}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-semibold" style={{ color }}>
              {score}
              <span className="text-xs text-muted-2">/{maxScore}</span>
            </div>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color, background: `${color}1a`, border: `1px solid ${color}44` }}
            >
              {statusLabel(status)}
            </span>
          </div>
        </div>

        {/* score bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(score / maxScore) * 100}%`, background: color, boxShadow: `0 0 12px ${color}88` }} />
        </div>

        {facts.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-muted-2">{f.label}</dt>
                <dd className="truncate text-white/90" title={f.value}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {record && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-2">Record</span>
              <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-[11px] text-gold transition hover:text-gold-light">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <code className="block max-h-24 overflow-auto rounded-lg border border-white/[0.06] bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed text-gold-light/90 break-all">
              {record}
            </code>
          </div>
        )}

        {(issues.length > 0 || suggestions.length > 0) && (
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left text-xs font-medium text-white/80 hover:text-white">
              <span className="inline-flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-gold" />
                {issues.length} issue{issues.length === 1 ? "" : "s"} · {suggestions.length} fix{suggestions.length === 1 ? "" : "es"}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-2 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="mt-3 space-y-3 text-xs">
                {issues.length > 0 && (
                  <ul className="space-y-1.5">
                    {issues.map((i, idx) => (
                      <li key={idx} className="flex gap-2 text-white/75">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {suggestions.length > 0 && (
                  <div className="rounded-lg border border-gold/25 bg-gold/[0.05] p-3">
                    <div className="eyebrow mb-2">How to fix</div>
                    <ol className="list-decimal space-y-1.5 pl-4 text-white/80">
                      {suggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {issues.length === 0 && status === "pass" && <p className="mt-4 text-xs text-muted">No issues detected. Nicely configured.</p>}
      </div>
    </SpotlightCard>
  );
}
