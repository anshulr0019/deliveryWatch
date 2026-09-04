"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Radar, Search } from "lucide-react";
import { ScoreGauge } from "./ScoreGauge";
import { ResultBreakdown } from "./ResultBreakdown";
import { SpotlightCard } from "./SpotlightCard";
import type { MailScoreResult } from "@/lib/dns-check";

const STEPS = ["Resolving SPF policy", "Probing DKIM selectors", "Reading DMARC record", "Mapping MX topology", "Querying 8 blacklists"];

export function ScannerHero({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MailScoreResult | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || loading) return;
    setError(null);
    setResult(null);
    setLoading(true);
    setStep(0);
    const ticker = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 650);
    try {
      const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setResult(data as MailScoreResult);
      setTimeout(() => document.getElementById("scan-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  };

  return (
    <section id="check" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 sm:px-6">
      <SpotlightCard borderGlowColor="rgba(16, 185, 129, 0.4)" innerClassName="p-6 sm:p-10 border border-slate-200/80">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <Radar className="h-3.5 w-3.5 text-emerald-600" /> Instant Checker · No login needed
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#0B1311] sm:text-4xl">
            Score any domain in <span className="text-[#0F372E]">seconds</span>
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Live DNS checks for SPF, DKIM, DMARC, MX and 8 real-time blacklists. Nothing is stored.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourcompany.com"
              autoComplete="off"
              spellCheck={false}
              inputMode="url"
              className="input-domain !pl-12 text-slate-900"
              aria-label="Domain to check"
            />
          </div>
          <button type="submit" disabled={loading || !domain.trim()} className="btn-primary min-w-[160px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{loading ? "Scanning…" : "Check Domain"}</span>
            {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
          </button>
        </form>

        {loading && (
          <div className="mx-auto mt-6 max-w-xl">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="relative inline-block h-2 w-2 rounded-full bg-emerald-500">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                </span>
                {STEPS[step]}…
              </span>
              <span className="text-slate-500 font-semibold">
                {step + 1}/{STEPS.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0F372E] via-[#10B981] to-[#34D399] transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mx-auto mt-4 max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">
            {error}
          </p>
        )}

        {result && (
          <div id="scan-result" className="fade-up mt-10 scroll-mt-28 border-t border-slate-100 pt-10">
            <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr]">
              <div className="flex justify-center">
                <ScoreGauge score={result.totalScore} grade={result.grade} size={210} />
              </div>
              <div>
                <div className="eyebrow text-emerald-800">Result for</div>
                <h3 className="font-display mt-1 text-2xl font-bold text-[#0B1311] sm:text-3xl">{result.domain}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  <span className="text-slate-900 font-semibold">{result.tier}</span> · Estimated inbox placement{" "}
                  <span className="text-emerald-700 font-bold">{result.inboxProbability}%</span> · Scanned in{" "}
                  {(result.scanDurationMs / 1000).toFixed(1)}s
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {isAuthenticated ? (
                    <Link href={`/dashboard?add=${encodeURIComponent(result.domain)}`} className="btn-primary">
                      <span>Monitor {result.domain} 24/7</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <Link href={`/login?next=${encodeURIComponent(`/dashboard?add=${result.domain}`)}`} className="btn-primary">
                      <span>Monitor this domain free</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  )}
                  <button type="button" onClick={() => setResult(null)} className="btn-secondary">
                    Check another
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Create a free account to get re-checks every 15 minutes, history charts and WhatsApp / Slack / email alerts.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <ResultBreakdown result={result} />
            </div>
          </div>
        )}
      </SpotlightCard>
    </section>
  );
}
