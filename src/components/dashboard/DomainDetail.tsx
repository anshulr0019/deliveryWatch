"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Clock, Loader2, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";
import { ScoreGauge } from "@/components/mailscore/ScoreGauge";
import { ResultBreakdown } from "@/components/mailscore/ResultBreakdown";
import { ScoreHistoryChart } from "./ScoreHistoryChart";
import { scoreColor, scoreLabel, severityColor } from "@/lib/score-ui";
import type { MailScoreResult } from "@/lib/dns-check";

export interface CheckPoint {
  t: string;
  score: number;
  spf: string;
  dkim: string;
  dmarc: string;
  mx: string;
  rbl: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string | null;
  createdAt: string;
}

interface Props {
  domain: { id: string; domain: string; isActive: boolean; latestScore: number; lastCheckedAt: string | null; createdAt: string };
  latestResult: MailScoreResult | null;
  history: CheckPoint[];
  events: TimelineEvent[];
}

export function DomainDetail({ domain, latestResult, history, events }: Props) {
  const router = useRouter();
  const [rechecking, setRechecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const recheck = async () => {
    if (rechecking) return;
    setRechecking(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/domains/${domain.id}/recheck`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Re-check failed");
      const n = (data.events as unknown[]).length;
      const delta = data.previousScore === null ? null : data.score - data.previousScore;
      setFlash({
        kind: "ok",
        text: `Re-check complete — score ${data.score}/100${delta !== null && delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}. ${n ? `${n} change${n === 1 ? "" : "s"} detected.` : "No changes detected."}`,
      });
      router.refresh();
    } catch (err) {
      setFlash({ kind: "err", text: err instanceof Error ? err.message : "Re-check failed" });
    } finally {
      setRechecking(false);
    }
  };

  const toggleActive = async () => {
    setToggling(true);
    await fetch(`/api/domains/${domain.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !domain.isActive }) });
    router.refresh();
    setToggling(false);
  };

  const remove = async () => {
    if (!confirm(`Stop monitoring ${domain.domain}? All history will be deleted.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/domains/${domain.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else setDeleting(false);
  };

  const color = scoreColor(domain.latestScore);

  return (
    <div className="space-y-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      {/* hero */}
      <SpotlightCard className="p-1" borderGlowColor="rgba(200, 169, 110, 0.5)">
        <div className="rounded-[14px] bg-[#0B0D12]/80 p-6 sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
            <div className="flex justify-center">
              <ScoreGauge score={domain.latestScore} grade={latestResult?.grade} size={190} />
            </div>
            <div className="min-w-0 text-center lg:text-left">
              <div className="eyebrow">Monitored domain</div>
              <h1 className="font-display mt-1 break-all text-3xl font-semibold text-white sm:text-4xl">{domain.domain}</h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color, background: `${color}1a`, border: `1px solid ${color}44` }}>
                  {scoreLabel(domain.latestScore)}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${domain.isActive ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-muted-2"}`}>
                  {domain.isActive ? "Monitoring · every 15 min" : "Paused"}
                </span>
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
                <Clock className="h-3.5 w-3.5" />
                {domain.lastCheckedAt ? `Last checked ${formatDistanceToNow(new Date(domain.lastCheckedAt), { addSuffix: true })}` : "Not checked yet"} · Monitoring since{" "}
                {format(new Date(domain.createdAt), "MMM d, yyyy")}
              </p>
              {flash && (
                <p className={`mt-3 rounded-xl border px-3.5 py-2 text-sm ${flash.kind === "ok" ? "border-gold/30 bg-gold/[0.06] text-gold-light" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
                  {flash.text}
                </p>
              )}
            </div>
            <div className="flex flex-row flex-wrap justify-center gap-2 lg:flex-col">
              <button type="button" onClick={recheck} disabled={rechecking} className="btn-gold">
                {rechecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {rechecking ? "Checking…" : "Re-check Now"}
              </button>
              <button type="button" onClick={toggleActive} disabled={toggling} className="btn-ghost">
                {domain.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {domain.isActive ? "Pause" : "Resume"}
              </button>
              <button type="button" onClick={remove} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm text-muted-2 transition hover:bg-red-400/10 hover:text-red-300">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove
              </button>
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* chart */}
      <SpotlightCard>
        <div className="p-5 sm:p-6">
          <ScoreHistoryChart history={history} />
        </div>
      </SpotlightCard>

      {/* breakdown */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="eyebrow">Protocol breakdown</div>
            <h2 className="font-display mt-1 text-xl font-semibold text-white">Latest snapshot</h2>
          </div>
          {latestResult && <span className="text-xs text-muted-2">{format(new Date(latestResult.scannedAt), "PPpp")}</span>}
        </div>
        {latestResult ? (
          <ResultBreakdown result={latestResult} />
        ) : (
          <SpotlightCard>
            <div className="p-8 text-center text-sm text-muted">No snapshot yet. Run a re-check to populate the breakdown.</div>
          </SpotlightCard>
        )}
      </section>

      {/* timeline */}
      <section>
        <div className="mb-4">
          <div className="eyebrow">Event log</div>
          <h2 className="font-display mt-1 text-xl font-semibold text-white">Timeline</h2>
        </div>
        <SpotlightCard>
          <div className="p-5 sm:p-6">
            {events.length === 0 ? (
              <p className="text-sm text-muted">No events recorded yet.</p>
            ) : (
              <ol className="relative space-y-6 border-l border-white/[0.08] pl-6">
                {events.map((e) => {
                  const c = severityColor(e.severity);
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-[#0B0D12]" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-white">{e.title}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: c, background: `${c}1a`, border: `1px solid ${c}44` }}>
                          {e.severity}
                        </span>
                      </div>
                      {e.description && <p className="mt-1 text-sm text-muted">{e.description}</p>}
                      <p className="mt-1 text-xs text-muted-2" title={format(new Date(e.createdAt), "PPpp")}>
                        {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })} · {e.type}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </SpotlightCard>
      </section>
    </div>
  );
}
