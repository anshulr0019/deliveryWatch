"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Clock, Loader2, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/mailscore/ScrollReveal";
import { ScoreGauge } from "@/components/mailscore/ScoreGauge";
import { CheckCard } from "@/components/mailscore/CheckCard";
import { ScoreHistoryChart } from "./ScoreHistoryChart";
import { DeliveryWatchCopilot } from "./DeliveryWatchCopilot";
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
      setFlash({ kind: "ok", text: `Scanned: score is now ${data.score ?? domain.latestScore}/100` });
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
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#0F372E]">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* hero */}
      <ScrollReveal direction="up" amount={0.12}>
      <SpotlightCard borderGlowColor="rgba(16, 185, 129, 0.4)" innerClassName="p-6 sm:p-8">
        <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
          <div className="flex justify-center">
            <ScoreGauge score={domain.latestScore} grade={latestResult?.grade} size={190} />
          </div>
          <div className="min-w-0 text-center lg:text-left">
            <div className="eyebrow text-[#0F372E]">Monitored domain</div>
            <h1 className="font-display mt-1 break-all text-3xl font-bold text-[#0B1311] sm:text-4xl">{domain.domain}</h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color, background: `${color}15`, border: `1px solid ${color}33` }}>
                {scoreLabel(domain.latestScore)}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${domain.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                {domain.isActive ? "Monitoring · daily" : "Paused"}
              </span>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {domain.lastCheckedAt ? `Last checked ${formatDistanceToNow(new Date(domain.lastCheckedAt), { addSuffix: true })}` : "Not checked yet"} · Monitoring since{" "}
              {format(new Date(domain.createdAt), "MMM d, yyyy")}
            </p>
            {latestResult && !latestResult.complete && <p className="mt-2 text-sm text-amber-800">Partial DNS score: some checks are unknown. Review the observations below before changing DNS.</p>}
            <AnimatePresence initial={false}>
              {flash && (
                <motion.p
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  className={`mt-3 overflow-hidden rounded-xl border px-3.5 py-2 text-sm font-semibold ${flash.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                >
                  {flash.text}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-row flex-wrap justify-center gap-2.5 lg:flex-col">
            <button type="button" onClick={recheck} disabled={rechecking} className="btn-primary">
              {rechecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {rechecking ? "Checking…" : "Re-check Now"}
            </button>
            <button type="button" onClick={toggleActive} disabled={toggling} className="btn-secondary">
              {domain.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {domain.isActive ? "Pause" : "Resume"}
            </button>
            <button type="button" onClick={remove} disabled={deleting} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Remove
            </button>
          </div>
        </div>
      </SpotlightCard>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={0.04} amount={0.08}>
        <div id="copilot" className="scroll-mt-24">
          <DeliveryWatchCopilot domainId={domain.id} hasResult={Boolean(latestResult)} />
        </div>
      </ScrollReveal>

      {/* chart */}
      <ScrollReveal direction="up" delay={0.06} amount={0.12}>
        <SpotlightCard innerClassName="p-5 sm:p-6">
          <ScoreHistoryChart history={history} />
        </SpotlightCard>
      </ScrollReveal>

      {/* breakdown */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="eyebrow text-[#0F372E]">Protocol breakdown</div>
            <h2 className="font-display mt-1 text-xl font-bold text-[#0B1311]">Latest snapshot</h2>
          </div>
          {latestResult && <span className="text-xs text-slate-400">{format(new Date(latestResult.scannedAt), "PPpp")}</span>}
        </div>

        {latestResult ? (
          <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            <StaggerItem id="evidence-spf" className="scroll-mt-24">
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
            </StaggerItem>
            <StaggerItem id="evidence-dkim" className="scroll-mt-24">
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
            </StaggerItem>
            <StaggerItem id="evidence-dmarc" className="scroll-mt-24">
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
            </StaggerItem>
            <StaggerItem id="evidence-mx" className="scroll-mt-24">
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
            </StaggerItem>
            <StaggerItem id="evidence-rbl" className="scroll-mt-24">
            <CheckCard
              title="Blacklists (RBL)"
              subtitle="7 reputation providers"
              status={latestResult.rbl.status}
              score={latestResult.rbl.score}
              facts={[
                { label: "Checked IP", value: latestResult.rbl.ip ?? "unresolved" },
                { label: "Listed on", value: latestResult.rbl.listedOn.length ? latestResult.rbl.listedOn.join(", ") : "None reported (check coverage below)" },
              ]}
              issues={latestResult.rbl.issues}
              suggestions={latestResult.rbl.suggestions}
            />
            </StaggerItem>
          </StaggerContainer>
        ) : (
          <SpotlightCard innerClassName="p-8 text-center text-sm text-slate-500">
            No check data has been recorded for this domain yet. Click &ldquo;Re-check Now&rdquo; to trigger the first scan.
          </SpotlightCard>
        )}
      </section>

      {/* change events log */}
      <section>
        <div className="eyebrow text-[#0F372E]">Audit log</div>
        <h2 className="font-display mt-1 text-xl font-bold text-[#0B1311]">Recent events & alerts</h2>
        <div className="mt-4">
          {events.length === 0 ? (
            <SpotlightCard innerClassName="p-8 text-center text-sm text-slate-500">
              No change events or alerts recorded for this domain yet. We will notify you when records shift.
            </SpotlightCard>
          ) : (
            <StaggerContainer className="space-y-2" stagger={0.05}>
              {events.map((e) => (
                <StaggerItem key={e.id}>
                <SpotlightCard innerClassName="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                      <div className="text-sm font-semibold text-slate-900">{e.title}</div>
                      {e.description && <div className="text-xs text-slate-500 mt-0.5">{e.description}</div>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{format(new Date(e.createdAt), "PPp")}</span>
                </SpotlightCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>
    </div>
  );
}
