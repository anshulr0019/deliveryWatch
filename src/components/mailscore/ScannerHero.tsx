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
      <SpotlightCard borderGlowColor="rgba(200, 169, 110, 0.5)" innerClassName="p-6 sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.06] px-3.5 py-1 text-gold-light">
            <Radar className="h-3.5 w-3.5" /> Instant Checker · No login needed
          </div>
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            Score any domain in <span className="text-gold-gradient">seconds</span>
          </h2>
          <p className="mt-3 text-sm text-muted sm:text-base">Live DNS checks for SPF, DKIM, DMARC, MX and 8 real-time blacklists. Nothing is stored.</p>
        </div>

        <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourcompany.com"
              autoComplete="off"
              spellCheck={false}
              inputMode="url"
              className="input-dark !pl-12"
              aria-label="Domain to check"
            />
          </div>
          <button type="submit" disabled={loading || !domain.trim()} className="btn-gold group min-w-[160px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{loading ? "Scanning…" : "Check Domain"}</span>
            {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
          </button>
        </form>

        {loading && (
          <div className="mx-auto mt-6 max-w-xl">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="pulse-ring relative inline-block h-2 w-2 rounded-full bg-gold text-gold" />
                {STEPS[step]}…
              </span>
              <span>
                {step + 1}/{STEPS.length}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-deep transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
        )}

        {error && <p className="mx-auto mt-4 max-w-xl rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-center text-sm text-red-200">{error}</p>}

        {result && (
          <div id="scan-result" className="fade-up mt-10 scroll-mt-28 border-t border-white/[0.06] pt-10">
            <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr]">
              <div className="flex justify-center">
                <ScoreGauge score={result.totalScore} grade={result.grade} size={210} />
              </div>
              <div>
                <div className="eyebrow">Result for</div>
                <h3 className="font-display mt-1 text-2xl font-semibold text-white sm:text-3xl">{result.domain}</h3>
                <p className="mt-2 text-sm text-muted">
                  <span className="text-white font-medium">{result.tier}</span> · Estimated inbox placement <span className="text-gold-light font-semibold">{result.inboxProbability}%</span> · Scanned in{" "}
                  {(result.scanDurationMs / 1000).toFixed(1)}s
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {isAuthenticated ? (
                    <Link href={`/dashboard?add=${encodeURIComponent(result.domain)}`} className="btn-gold group">
                      <span>Monitor {result.domain} 24/7</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <Link href={`/login?next=${encodeURIComponent(`/dashboard?add=${result.domain}`)}`} className="btn-gold group">
                      <span>Monitor this domain free</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  )}
                  <button type="button" onClick={() => setResult(null)} className="btn-ghost">
                    Check another
                  </button>
                </div>
                <p className="mt-3 text-xs text-muted-2">Create a free account to get re-checks every 15 minutes, history charts and WhatsApp / Slack / email alerts.</p>
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
