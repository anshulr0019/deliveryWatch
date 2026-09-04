"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Clock, Loader2, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";
import { ScoreGauge } from "@/components/mailscore/ScoreGauge";
import { CheckCard } from "@/components/mailscore/CheckCard";
import { ScoreHistoryChart } from "./ScoreHistoryChart";
import { scoreColor, scoreLabel } from "@/lib/score-ui";
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

export interface DomainDetailProps {
  domain: {
    id: string;
    domain: string;
    isActive: boolean;
    latestScore: number;
    lastCheckedAt: string | null;
    createdAt: string;
  };
  latestResult: MailScoreResult | null;
  history: CheckPoint[];
  events: TimelineEvent[];
}

export function DomainDetail({ domain, latestResult, history, events }: DomainDetailProps) {
  const router = useRouter();
  const [rechecking, setRechecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const color = scoreColor(domain.latestScore);

  const recheck = async () => {
    setRechecking(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/domains/${domain.id}/recheck`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to recheck");
      setFlash({ kind: "ok", text: `Scanned: score is now ${data.check?.score ?? domain.latestScore}/100` });
      router.refresh();
    } catch (err) {
      setFlash({ kind: "err", text: err instanceof Error ? err.message : "Failed to recheck" });
    } finally {
      setRechecking(false);
    }
  };

  const toggleActive = async () => {
    setToggling(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/domains/${domain.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !domain.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      router.refresh();
    } catch (err) {
      setFlash({ kind: "err", text: err instanceof Error ? err.message : "Failed to update" });
    } finally {
      setToggling(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Stop monitoring ${domain.domain}? All historical score data will be permanently deleted.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/domains/${domain.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete domain");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setFlash({ kind: "err", text: err instanceof Error ? err.message : "Failed to delete" });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      {/* hero */}
      <SpotlightCard borderGlowColor="rgba(200, 169, 110, 0.5)" innerClassName="p-6 sm:p-8">
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
          <div className="flex flex-row flex-wrap justify-center gap-2.5 lg:flex-col">
            <button type="button" onClick={recheck} disabled={rechecking} className="btn-gold">
              {rechecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {rechecking ? "Checking…" : "Re-check Now"}
            </button>
            <button type="button" onClick={toggleActive} disabled={toggling} className="btn-ghost">
              {domain.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {domain.isActive ? "Pause" : "Resume"}
            </button>
            <button type="button" onClick={remove} disabled={deleting} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/15 hover:border-red-500/40">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Remove
            </button>
          </div>
        </div>
      </SpotlightCard>

      {/* chart */}
      <SpotlightCard innerClassName="p-5 sm:p-6">
        <ScoreHistoryChart history={history} />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CheckCard
              title="SPF"
              subtitle="Sender Policy Framework"
              status={latestResult.spf.status}
              score={latestResult.spf.score}
              record={latestResult.spf.record}
              facts={[
                { label: "Qualifier", value: latestResult.spf.qualifier ?? "none" },
                { label: "Includes", value: latestResult.spf.includes.length ? latestResult.spf.includes.join(", ") : "none" },
              ]}
              issues={latestResult.spf.issues}
              suggestions={latestResult.spf.suggestions}
            />
            <CheckCard
              title="DKIM"
              subtitle="DomainKeys Identified Mail"
              status={latestResult.dkim.status}
              score={latestResult.dkim.score}
              facts={[
                { label: "Best selector", value: latestResult.dkim.bestSelector ?? "none found" },
                { label: "Key length", value: latestResult.dkim.keyBits ? `${latestResult.dkim.keyBits} bits` : "n/a" },
              ]}
              issues={latestResult.dkim.issues}
              suggestions={latestResult.dkim.suggestions}
            />
            <CheckCard
              title="DMARC"
              subtitle="Domain-based Message Auth"
              status={latestResult.dmarc.status}
              score={latestResult.dmarc.score}
              record={latestResult.dmarc.record}
              facts={[{ label: "Policy (p=)", value: latestResult.dmarc.policy ?? "none" }]}
              issues={latestResult.dmarc.issues}
              suggestions={latestResult.dmarc.suggestions}
            />
            <CheckCard
              title="MX Records"
              subtitle="Mail Exchange routing"
              status={latestResult.mx.status}
              score={latestResult.mx.score}
              facts={[
                { label: "Primary provider", value: latestResult.mx.primaryProvider ?? "unknown" },
                { label: "MX count", value: String(latestResult.mx.records.length) },
              ]}
              issues={latestResult.mx.issues}
              suggestions={latestResult.mx.suggestions}
            />
            <CheckCard
              title="Blacklists (RBL)"
              subtitle="8 reputation providers"
              status={latestResult.rbl.status}
              score={latestResult.rbl.score}
              facts={[
                { label: "Outbound IP", value: latestResult.rbl.ip ?? "unresolved" },
                { label: "Listed on", value: latestResult.rbl.listedOn.length ? latestResult.rbl.listedOn.join(", ") : "0 of 8 clean" },
              ]}
              issues={latestResult.rbl.issues}
              suggestions={latestResult.rbl.suggestions}
            />
          </div>
        ) : (
          <SpotlightCard innerClassName="p-8 text-center text-sm text-muted">
            No check data has been recorded for this domain yet. Click &ldquo;Re-check Now&rdquo; to trigger the first scan.
          </SpotlightCard>
        )}
      </section>

      {/* change events log */}
      <section>
        <div className="eyebrow">Audit log</div>
        <h2 className="font-display mt-1 text-xl font-semibold text-white">Recent events & alerts</h2>
        <div className="mt-4">
          {events.length === 0 ? (
            <SpotlightCard innerClassName="p-8 text-center text-sm text-muted">
              No change events or alerts recorded for this domain yet. We will notify you when records shift.
            </SpotlightCard>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <SpotlightCard key={e.id} innerClassName="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        e.severity === "critical"
                          ? "badge-fail"
                          : e.severity === "warning"
                            ? "badge-warn"
                            : "badge-pass"
                      }`}
                    >
                      {e.severity}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-white">{e.title}</div>
                      {e.description && <div className="text-xs text-muted mt-0.5">{e.description}</div>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-2 shrink-0">{format(new Date(e.createdAt), "PPp")}</span>
                </SpotlightCard>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
