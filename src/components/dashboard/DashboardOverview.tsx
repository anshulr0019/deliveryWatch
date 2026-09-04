"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Activity, ArrowRight, Bell, Globe, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";
import { scoreColor, scoreLabel, severityColor } from "@/lib/score-ui";

export interface DomainRow {
  id: string;
  domain: string;
  isActive: boolean;
  latestScore: number;
  lastCheckedAt: string | null;
  createdAt: string;
}

interface RecentEvent {
  id: string;
  domainId: string;
  domain: string;
  type: string;
  severity: string;
  title: string;
  createdAt: string;
}

interface Props {
  initialDomains: DomainRow[];
  stats: { count: number; avg: number; activeAlerts: number };
  recentEvents: RecentEvent[];
  prefillDomain?: string;
}

const SCAN_STEPS = ["Resolving SPF", "Probing DKIM selectors", "Reading DMARC", "Mapping MX", "Querying blacklists", "Saving baseline"];

export function DashboardOverview({ initialDomains, stats, recentEvents, prefillDomain = "" }: Props) {
  const router = useRouter();
  const [list, setList] = useState<DomainRow[]>(initialDomains);
  const [input, setInput] = useState(prefillDomain);
  const [adding, setAdding] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(prefillDomain) || initialDomains.length === 0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setList(initialDomains), [initialDomains]);
  useEffect(() => {
    if (showForm) inputRef.current?.focus();
  }, [showForm]);

  const count = list.length;
  const avg = count ? Math.round(list.reduce((s, d) => s + d.latestScore, 0) / count) : 0;

  const addDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || adding) return;
    setError(null);
    setAdding(true);
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(SCAN_STEPS.length - 1, s + 1)), 700);
    try {
      const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: input }) });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.domainId) {
          router.push(`/dashboard/${data.domainId}`);
          return;
        }
        throw new Error(data.error ?? "Failed to add domain");
      }
      setList((l) => [
        { id: data.domainId, domain: data.domain, isActive: true, latestScore: data.score, lastCheckedAt: data.result.scannedAt, createdAt: new Date().toISOString() },
        ...l,
      ]);
      setInput("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    } finally {
      clearInterval(t);
      setAdding(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Stop monitoring ${name}? All history will be deleted.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/domains/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((l) => l.filter((d) => d.id !== id));
      router.refresh();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow text-[#0F372E]">Overview</div>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-[#0B1311]">Monitored domains</h1>
          <p className="mt-1 text-sm text-slate-600">Re-checked automatically every 15 minutes. Alerts fire on any warning or critical change.</p>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add Domain
        </button>
      </div>

      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Globe} label="Domains monitored" value={String(count)} hint={count === 1 ? "1 domain under watch" : `${count} domains under watch`} />
        <StatCard
          icon={Activity}
          label="Average deliverability"
          value={count ? `${avg}` : "—"}
          hint={count ? scoreLabel(avg) : "Add a domain to begin"}
          valueColor={count ? scoreColor(avg) : undefined}
        />
        <StatCard
          icon={Bell}
          label="Active alerts (7d)"
          value={String(stats.activeAlerts)}
          hint={stats.activeAlerts ? "Warning or critical events" : "All quiet"}
          valueColor={stats.activeAlerts ? "#F59E0B" : "#10B981"}
        />
      </div>

      {/* add form */}
      {showForm && (
        <SpotlightCard borderGlowColor="rgba(16, 185, 129, 0.4)">
          <form onSubmit={addDomain} className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Add a domain to monitor, e.g. yourcompany.com"
                className="input-domain flex-1"
                disabled={adding}
                spellCheck={false}
                autoComplete="off"
              />
              <button type="submit" disabled={adding || !input.trim()} className="btn-primary min-w-[170px]">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {adding ? "Scanning…" : "Add & Scan"}
              </button>
            </div>
            {adding && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <span className="relative inline-block h-2 w-2 rounded-full bg-emerald-500">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    </span>
                    {SCAN_STEPS[step]}…
                  </span>
                  <span>
                    {step + 1}/{SCAN_STEPS.length}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-gradient-to-r from-[#0F372E] via-[#10B981] to-[#34D399] transition-all duration-500" style={{ width: `${((step + 1) / SCAN_STEPS.length) * 100}%` }} />
                </div>
              </div>
            )}
            {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}
          </form>
        </SpotlightCard>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* domain list */}
        <div className="space-y-3">
          {list.length === 0 ? (
            <SpotlightCard>
              <div className="p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-[#0F372E]">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="font-display mt-4 text-lg font-bold text-[#0B1311]">No domains yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">Add your first domain to start monitoring. We&apos;ll run a baseline scan immediately.</p>
              </div>
            </SpotlightCard>
          ) : (
            list.map((d) => {
              const color = scoreColor(d.latestScore);
              return (
                <SpotlightCard key={d.id}>
                  <div className="flex items-center gap-4 p-4 sm:p-5">
                    <Link href={`/dashboard/${d.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-display text-lg font-bold" style={{ color }}>
                        {d.latestScore}
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: d.isActive ? color : "#94A3B8" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-bold text-slate-900">{d.domain}</span>
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color, background: `${color}15`, border: `1px solid ${color}33` }}>
                            {scoreLabel(d.latestScore)}
                          </span>
                          {!d.isActive && <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-500">Paused</span>}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {d.lastCheckedAt ? `Checked ${formatDistanceToNow(new Date(d.lastCheckedAt), { addSuffix: true })}` : "Not checked yet"}
                        </div>
                        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${d.latestScore}%`, background: color }} />
                        </div>
                      </div>
                      <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(d.id, d.domain)}
                      disabled={deleting === d.id}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${d.domain}`}
                    >
                      {deleting === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </SpotlightCard>
              );
            })
          )}
        </div>

        {/* recent activity */}
        <SpotlightCard className="h-fit">
          <div className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-[#0B1311]">Recent activity</h3>
              <span className="text-xs font-semibold text-slate-400">Last 7 days</span>
            </div>
            {recentEvents.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No events yet. Activity will appear here as we detect changes.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentEvents.map((e) => (
                  <li key={e.id}>
                    <Link href={`/dashboard/${e.domainId}`} className="flex gap-3 rounded-lg p-1.5 transition hover:bg-slate-50">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: severityColor(e.severity) }} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">{e.title}</div>
                        <div className="text-xs text-slate-400">
                          {e.domain} · {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, valueColor }: { icon: typeof Globe; label: string; value: string; hint: string; valueColor?: string }) {
  return (
    <SpotlightCard>
      <div className="flex items-start justify-between p-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</div>
          <div className="font-display mt-2 text-3xl font-extrabold text-[#0B1311]" style={valueColor ? { color: valueColor } : undefined}>
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-medium">{hint}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-[#0F372E]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SpotlightCard>
  );
}
