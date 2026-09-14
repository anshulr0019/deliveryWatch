"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDotDashed,
  ExternalLink,
  FileSearch,
  Info,
  Lightbulb,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";

export interface DeliveryWatchCopilotProps {
  domainId: string;
  hasResult: boolean;
}

interface SetupProfile {
  dnsProvider: string;
  emailServices: string[];
  sendingPurpose: string;
  notes: string;
}

interface EvidenceItem {
  label?: string;
  value?: string;
  href?: string | null;
  url?: string | null;
  observedAt?: string;
}

interface ReferenceItem {
  label?: string;
  title?: string;
  href?: string | null;
  url?: string | null;
}

interface Finding {
  id?: string;
  key?: string;
  check?: string;
  protocol?: string;
  title: string;
  status?: string;
  severity?: string;
  summary?: string;
  explanation?: string;
  whatChanged?: string;
  change?: string;
  changeSummary?: string;
  impact?: string;
  nextStep?: string;
  evidence?: Array<EvidenceItem | string>;
  sources?: ReferenceItem[];
  references?: ReferenceItem[];
  steps?: Array<FixStep | string>;
}

interface ReportScore {
  current?: number;
  previous?: number | null;
  delta?: number | null;
  direction?: string;
}

interface CopilotReport {
  id?: string;
  summary?: string | {
    headline?: string;
    detail?: string;
    healthyCount?: number;
    attentionCount?: number;
  };
  scopeNotice?: string;
  generatedAt?: string;
  whatChanged?: Array<string | { label?: string; description?: string }>;
  changes?: Array<string | { label?: string; description?: string }>;
  findings?: Finding[];
  references?: ReferenceItem[];
  score?: ReportScore;
}

interface FixStep {
  id?: string;
  title?: string;
  description?: string;
  instruction?: string;
  source?: ReferenceItem;
}

interface VerificationResult {
  status?: string;
  message?: string;
  summary?: string;
  scoreBefore?: number;
  scoreAfter?: number;
  verifiedAt?: string;
}

interface Investigation {
  id: string;
  findingId?: string;
  findingKey?: string;
  status?: string;
  title?: string;
  summary?: string;
  prerequisites?: string[];
  steps?: Array<FixStep | string>;
  references?: ReferenceItem[];
  resolutionNote?: string;
  verification?: VerificationResult | null;
}

interface CopilotPayload {
  setupProfile?: Partial<SetupProfile> | null;
  report?: CopilotReport | null;
  investigations?: Investigation[];
  investigation?: Investigation;
}

type BusyAction = "loading" | "setup" | "explain" | "open" | "note" | "verify";

const EMPTY_SETUP: SetupProfile = {
  dnsProvider: "",
  emailServices: [],
  sendingPurpose: "",
  notes: "",
};

const DNS_PROVIDERS = ["Cloudflare", "GoDaddy", "Namecheap", "Route 53", "Google Cloud DNS", "Other"];

function findingKey(finding: Finding) {
  return finding.id ?? finding.key ?? finding.protocol ?? finding.check ?? finding.title;
}

function mergeSetup(profile?: Partial<SetupProfile> | null): SetupProfile {
  return {
    dnsProvider: typeof profile?.dnsProvider === "string" ? profile.dnsProvider : "",
    emailServices: Array.isArray(profile?.emailServices) ? profile.emailServices.filter((item): item is string => typeof item === "string") : [],
    sendingPurpose: typeof profile?.sendingPurpose === "string" ? profile.sendingPurpose : "",
    notes: typeof profile?.notes === "string" ? profile.notes : "",
  };
}

function unwrapPayload(value: unknown): CopilotPayload {
  if (!value || typeof value !== "object") return {};
  const outer = value as Record<string, unknown>;
  const candidate = outer.data && typeof outer.data === "object" ? outer.data : outer.copilot && typeof outer.copilot === "object" ? outer.copilot : outer;
  return candidate as CopilotPayload;
}

function parseError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function statusMeta(status?: string, severity?: string) {
  const value = `${status ?? ""} ${severity ?? ""}`.toLowerCase();
  if (value.includes("critical") || value.includes("fail") || value.includes("error")) {
    return { label: severity ?? status ?? "Critical", badge: "border-rose-200 bg-rose-50 text-rose-700", icon: XCircle };
  }
  if (value.includes("warn") || value.includes("degrad") || value.includes("unknown")) {
    return { label: severity ?? status ?? "Warning", badge: "border-amber-200 bg-amber-50 text-amber-800", icon: AlertTriangle };
  }
  return { label: severity ?? status ?? "Needs attention", badge: "border-sky-200 bg-sky-50 text-sky-700", icon: Info };
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function reportSummary(summary?: CopilotReport["summary"]) {
  if (typeof summary === "string") return { headline: null, detail: summary };
  return {
    headline: summary?.headline ?? null,
    detail: summary?.detail ?? "No additional explanation was returned for this scan.",
  };
}

function LinkChip({ item, fallbackLabel }: { item: ReferenceItem | EvidenceItem; fallbackLabel: string }) {
  const href = item.href ?? item.url;
  const label = "title" in item ? item.title ?? item.label : item.label;
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-emerald-300 hover:text-[#0F372E]"
    >
      <ExternalLink className="h-3 w-3" />
      {label || fallbackLabel}
    </a>
  );
}

export function DeliveryWatchCopilot({ domainId, hasResult }: DeliveryWatchCopilotProps) {
  const [setup, setSetup] = useState<SetupProfile>(EMPTY_SETUP);
  const [servicesInput, setServicesInput] = useState("");
  const [report, setReport] = useState<CopilotReport | null>(null);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<BusyAction | null>("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const endpoint = `/api/domains/${domainId}/copilot`;

  const applyPayload = (value: unknown) => {
    const payload = unwrapPayload(value);
    if (payload.setupProfile !== undefined) {
      const nextSetup = mergeSetup(payload.setupProfile);
      setSetup(nextSetup);
      setServicesInput(nextSetup.emailServices.join(", "));
    }
    if (payload.report !== undefined) setReport(payload.report);
    if (Array.isArray(payload.investigations)) {
      setInvestigations(payload.investigations);
      setResolutionNotes((current) => {
        const next = { ...current };
        for (const item of payload.investigations ?? []) {
          if (next[item.id] === undefined) next[item.id] = item.resolutionNote ?? "";
        }
        return next;
      });
    } else if (payload.investigation?.id) {
      setInvestigations((current) => {
        const exists = current.some((item) => item.id === payload.investigation?.id);
        return exists ? current.map((item) => (item.id === payload.investigation?.id ? payload.investigation! : item)) : [payload.investigation!, ...current];
      });
      setResolutionNotes((current) => ({
        ...current,
        [payload.investigation!.id]: payload.investigation!.resolutionNote ?? current[payload.investigation!.id] ?? "",
      }));
    }
    return payload;
  };

  useEffect(() => {
    const controller = new AbortController();
    setBusy("loading");
    setError(null);
    fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error((data as { error?: string }).error ?? "Could not load Copilot");
        applyPayload(data);
      })
      .catch((loadError) => {
        if ((loadError as { name?: string }).name !== "AbortError") setError(parseError(loadError, "Could not load Copilot"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(null);
      });
    return () => controller.abort();
    // The domain is the lifecycle boundary for this panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainId, endpoint]);

  const postAction = async (body: Record<string, unknown>, action: BusyAction, targetId?: string) => {
    setBusy(action);
    setBusyId(targetId ?? null);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Copilot request failed");
      return applyPayload(data);
    } catch (actionError) {
      setError(parseError(actionError, "Copilot request failed"));
      return null;
    } finally {
      setBusy(null);
      setBusyId(null);
    }
  };

  const saveSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("setup");
    setError(null);
    setNotice(null);
    const setupProfile = {
      ...setup,
      emailServices: servicesInput.split(",").map((item) => item.trim()).filter(Boolean),
    };
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupProfile }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Could not save your email setup");
      const payload = applyPayload(data);
      if (payload.setupProfile === undefined) {
        setSetup(setupProfile);
        setServicesInput(setupProfile.emailServices.join(", "));
      }
      setNotice("Email setup saved. Future guidance will use this context.");
      setShowSetup(false);
    } catch (saveError) {
      setError(parseError(saveError, "Could not save your email setup"));
    } finally {
      setBusy(null);
    }
  };

  const explainReport = async () => {
    const payload = await postAction({ action: "explain" }, "explain");
    if (payload) setNotice("Report explanation is ready.");
  };

  const openInvestigation = async (finding: Finding) => {
    const key = findingKey(finding);
    const existing = investigations.find((item) => item.findingId === key || item.findingKey === key);
    if (existing) {
      setExpandedFinding((current) => (current === key ? null : key));
      return;
    }
    setExpandedFinding(key);
    const payload = await postAction({ action: "open", findingId: key, findingKey: key }, "open", key);
    if (payload?.investigation) setExpandedFinding(key);
  };

  const saveNote = async (investigation: Investigation) => {
    const payload = await postAction(
      { action: "note", investigationId: investigation.id, resolutionNote: resolutionNotes[investigation.id] ?? "" },
      "note",
      investigation.id,
    );
    if (payload) setNotice("Resolution note saved to this investigation.");
  };

  const verifyFix = async (investigation: Investigation) => {
    const payload = await postAction({ action: "verify", investigationId: investigation.id }, "verify", investigation.id);
    if (payload) setNotice("Verification scan completed. Review the result below.");
  };

  const findings = (report?.findings ?? []).filter((finding) => finding.status?.toLowerCase() !== "pass");
  const changes = report?.whatChanged ?? report?.changes ?? [];
  const setupComplete = Boolean(setup.dnsProvider || setup.emailServices.length || setup.sendingPurpose || setup.notes);
  const hasUnhealthyFindings = findings.length > 0;

  const scoreChange = useMemo(() => {
    if (!report?.score || report.score.delta === null || report.score.delta === undefined || report.score.delta === 0) return null;
    const sign = report.score.delta > 0 ? "+" : "";
    return `${sign}${report.score.delta} points`;
  }, [report?.score]);

  const summary = reportSummary(report?.summary);

  return (
    <section aria-labelledby="deliverywatch-copilot-title">
      <SpotlightCard borderGlowColor="rgba(16, 185, 129, 0.45)" innerClassName="overflow-hidden">
        <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.13),transparent_45%)] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-[#0F372E] shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="deliverywatch-copilot-title" className="font-display text-xl font-bold text-[#0B1311]">
                    DeliveryWatch Copilot
                  </h2>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-800">
                    Evidence-based guidance
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Understand what changed, get a fix tailored to your setup, and verify that the problem is resolved.
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setShowSetup((current) => !current)} className="btn-secondary shrink-0" aria-expanded={showSetup}>
              <Settings2 className="h-4 w-4" />
              {setupComplete ? "Edit email setup" : "Add email setup"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSetup ? "rotate-180" : ""}`} />
            </button>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-white/75 px-3.5 py-2.5 text-xs leading-5 text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <span>
              Copilot explains recorded evidence and reviewed guidance. DeliveryWatch&apos;s deterministic DNS and blacklist checks remain the source of truth for every status and score.
            </span>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showSetup && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-b border-slate-100"
            >
              <form onSubmit={saveSetup} className="bg-slate-50/70 p-5 sm:p-7">
                <div className="mb-5">
                  <div className="eyebrow text-[#0F372E]">Your email setup</div>
                  <p className="mt-1 text-sm text-slate-600">This context helps tailor instructions without guessing provider-specific records or legitimate senders.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">DNS provider</span>
                    <input
                      list={`dns-providers-${domainId}`}
                      value={setup.dnsProvider}
                      onChange={(event) => setSetup((current) => ({ ...current, dnsProvider: event.target.value }))}
                      placeholder="Cloudflare"
                      className="input-domain"
                    />
                    <datalist id={`dns-providers-${domainId}`}>
                      {DNS_PROVIDERS.map((provider) => <option key={provider} value={provider} />)}
                    </datalist>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Email services</span>
                    <input
                      value={servicesInput}
                      onChange={(event) => setServicesInput(event.target.value)}
                      placeholder="Google Workspace, Resend"
                      className="input-domain"
                    />
                    <span className="mt-1.5 block text-[11px] text-slate-500">Separate multiple services with commas.</span>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">What do you send?</span>
                    <input
                      value={setup.sendingPurpose}
                      onChange={(event) => setSetup((current) => ({ ...current, sendingPurpose: event.target.value }))}
                      placeholder="Employee email, product notifications, newsletters…"
                      className="input-domain"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Private setup notes</span>
                    <textarea
                      value={setup.notes}
                      onChange={(event) => setSetup((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="Known selectors, sending subdomains, or anything useful during an investigation"
                      className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowSetup(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={busy === "setup"} className="btn-primary">
                    {busy === "setup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save setup
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-5 sm:p-7">
          <div aria-live="polite" className="space-y-3">
            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                >
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800" aria-label="Dismiss error">×</button>
                </motion.div>
              )}
              {notice && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">{notice}</span>
                  <button type="button" onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900" aria-label="Dismiss message">×</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {busy === "loading" ? (
            <div className="space-y-4" aria-label="Loading Copilot">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          ) : !hasResult ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                <CircleDotDashed className="h-6 w-6" />
              </div>
              <h3 className="font-display mt-4 text-lg font-bold text-[#0B1311]">Run the first domain scan</h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">Copilot needs a recorded scan before it can explain findings or prepare a fix plan. You can save your email setup now.</p>
              {!setupComplete && <button type="button" onClick={() => setShowSetup(true)} className="btn-secondary mt-5"><Settings2 className="h-4 w-4" /> Add email setup</button>}
            </div>
          ) : !report ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-[#0F372E]">
                <FileSearch className="h-6 w-6" />
              </div>
              <h3 className="font-display mt-4 text-lg font-bold text-[#0B1311]">Ready to explain this report</h3>
              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">Copilot will organize the scan evidence, compare it with the previous result, and show what to check first.</p>
              <button type="button" onClick={explainReport} disabled={busy === "explain"} className="btn-primary mt-5">
                {busy === "explain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy === "explain" ? "Preparing explanation…" : "Explain this report"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="eyebrow text-[#0F372E]">Report explanation</div>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(report.generatedAt) ? `Prepared ${formatDate(report.generatedAt)}` : "Based on the latest recorded scan"}</p>
                </div>
                <button type="button" onClick={explainReport} disabled={busy === "explain"} className="btn-secondary shrink-0">
                  {busy === "explain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh explanation
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0F372E]"><Lightbulb className="h-4 w-4" /> Summary</div>
                  {summary.headline && <p className="mt-2 text-sm font-bold text-emerald-950">{summary.headline}</p>}
                  <p className={`${summary.headline ? "mt-1" : "mt-2"} text-sm leading-6 text-slate-700`}>{summary.detail}</p>
                  {report.scopeNotice && <p className="mt-3 border-t border-emerald-100 pt-3 text-xs leading-5 text-slate-500">{report.scopeNotice}</p>}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-900">What changed</div>
                    {scoreChange && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${(report.score?.delta ?? 0) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{scoreChange}</span>}
                  </div>
                  {changes.length ? (
                    <ul className="mt-3 space-y-2">
                      {changes.slice(0, 4).map((change, index) => (
                        <li key={`${typeof change === "string" ? change : change.label}-${index}`} className="flex gap-2 text-xs leading-5 text-slate-600">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                          <span>{typeof change === "string" ? change : change.description ?? change.label ?? "Recorded change"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 text-xs leading-5 text-slate-500">No material change was found compared with the previous recorded scan.</p>}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="eyebrow text-[#0F372E]">Findings</div>
                    <h3 className="font-display mt-1 text-lg font-bold text-[#0B1311]">What needs attention</h3>
                  </div>
                  <span className="text-xs text-slate-400">{findings.length} {findings.length === 1 ? "finding" : "findings"}</span>
                </div>

                {!hasUnhealthyFindings ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" />
                    <h4 className="mt-2 font-bold text-emerald-950">No unhealthy findings in this report</h4>
                    <p className="mt-1 text-sm text-emerald-800/80">The recorded checks did not identify an issue that needs a fix plan.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {findings.map((finding) => {
                      const key = findingKey(finding);
                      const meta = statusMeta(finding.status, finding.severity);
                      const StatusIcon = meta.icon;
                      const investigation = investigations.find((item) => item.findingId === key || item.findingKey === key);
                      const expanded = expandedFinding === key;
                      const references = finding.references ?? finding.sources ?? [];
                      return (
                        <motion.article key={key} layout className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-22px_rgba(15,55,46,0.35)]">
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex min-w-0 gap-3">
                                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                                  <StatusIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.13em] ${meta.badge}`}>{meta.label}</span>
                                    {(finding.protocol || finding.check) && <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">{finding.protocol ?? finding.check}</span>}
                                  </div>
                                  <h4 className="mt-2 font-display text-base font-bold text-slate-950">{finding.title}</h4>
                                  <p className="mt-1 text-sm leading-6 text-slate-600">{finding.explanation ?? finding.summary ?? "Review the evidence and next step for this finding."}</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => openInvestigation(finding)} disabled={busy === "open" && busyId === key} className="btn-primary shrink-0 self-start" aria-expanded={expanded}>
                                {busy === "open" && busyId === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                                {investigation ? "Open fix plan" : "Help me fix this"}
                              </button>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {(finding.whatChanged || finding.changeSummary || finding.change) && (
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Detected change</div>
                                  <p className="mt-1 text-xs leading-5 text-slate-600">{finding.whatChanged ?? finding.changeSummary ?? finding.change}</p>
                                </div>
                              )}
                              {finding.impact && (
                                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
                                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Potential impact</div>
                                  <p className="mt-1 text-xs leading-5 text-slate-600">{finding.impact}</p>
                                </div>
                              )}
                            </div>

                            {finding.nextStep && <p className="mt-3 text-xs leading-5 text-slate-600"><strong className="text-slate-800">Check first:</strong> {finding.nextStep}</p>}

                            {(finding.evidence?.length || references.length) ? (
                              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                                <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><BookOpen className="h-3 w-3" /> Evidence</span>
                                {finding.evidence?.map((item, index) => typeof item === "string" ? (
                                  <span key={`${item}-${index}`} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">{item}</span>
                                ) : item.href || item.url ? (
                                  <LinkChip key={`${item.href ?? item.url}-${index}`} item={item} fallbackLabel={`Evidence ${index + 1}`} />
                                ) : (
                                  <span key={`${item.label}-${index}`} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">{item.label}{item.value ? `: ${item.value}` : ""}</span>
                                ))}
                                {references.map((reference, index) => <LinkChip key={`${reference.href ?? reference.url}-${index}`} item={reference} fallbackLabel={`Guidance ${index + 1}`} />)}
                              </div>
                            ) : null}
                          </div>

                          <AnimatePresence initial={false}>
                            {expanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                                  {busy === "open" && busyId === key && !investigation ? (
                                    <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Preparing a fix plan…</div>
                                  ) : investigation ? (
                                    <FixPlan
                                      investigation={investigation}
                                      fallbackSteps={finding.steps}
                                      note={resolutionNotes[investigation.id] ?? ""}
                                      onNoteChange={(value) => setResolutionNotes((current) => ({ ...current, [investigation.id]: value }))}
                                      onSaveNote={() => saveNote(investigation)}
                                      onVerify={() => verifyFix(investigation)}
                                      savingNote={busy === "note" && busyId === investigation.id}
                                      verifying={busy === "verify" && busyId === investigation.id}
                                    />
                                  ) : (
                                    <div className="py-5 text-center text-sm text-slate-500">The fix plan could not be opened. Try again.</div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </div>

              {report.references?.length ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Report sources</span>
                  {report.references.map((reference, index) => <LinkChip key={`${reference.href ?? reference.url}-${index}`} item={reference} fallbackLabel={`Source ${index + 1}`} />)}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </SpotlightCard>
    </section>
  );
}

function FixPlan({
  investigation,
  fallbackSteps,
  note,
  onNoteChange,
  onSaveNote,
  onVerify,
  savingNote,
  verifying,
}: {
  investigation: Investigation;
  fallbackSteps?: Array<FixStep | string>;
  note: string;
  onNoteChange: (value: string) => void;
  onSaveNote: () => void;
  onVerify: () => void;
  savingNote: boolean;
  verifying: boolean;
}) {
  const steps = investigation.steps?.length ? investigation.steps : fallbackSteps ?? [];
  const verification = investigation.verification;
  const verificationStatus = verification?.status?.toLowerCase() ?? "";
  const verified = verificationStatus.includes("pass") || verificationStatus.includes("recover") || verificationStatus.includes("resolved");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F372E]"><Wrench className="h-4 w-4" /> Guided fix plan</div>
          <h5 className="mt-1 font-display text-base font-bold text-slate-950">{investigation.title ?? "Resolve this finding"}</h5>
          {investigation.summary && <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">{investigation.summary}</p>}
        </div>
        {investigation.status && <span className="self-start rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-slate-500">{investigation.status}</span>}
      </div>

      {investigation.prerequisites?.length ? (
        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">Before you start</div>
          <ul className="mt-2 space-y-1.5">
            {investigation.prerequisites.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-xs leading-5 text-slate-600"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />{item}</li>)}
          </ul>
        </div>
      ) : null}

      {steps.length ? (
        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => {
            const item = typeof step === "string" ? { description: step } : step;
            return (
              <li key={item.id ?? `${item.title ?? item.description}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0F372E] text-[11px] font-bold text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  {item.title && <div className="text-xs font-bold text-slate-900">{item.title}</div>}
                  <p className={`${item.title ? "mt-0.5" : ""} text-xs leading-5 text-slate-600`}>{item.description ?? item.instruction}</p>
                  {item.source && <div className="mt-2"><LinkChip item={item.source} fallbackLabel="Provider guidance" /></div>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No safe provider-specific steps are available yet. Add your email setup or review the linked provider guidance.</p>}

      {investigation.references?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {investigation.references.map((reference, index) => <LinkChip key={`${reference.href ?? reference.url}-${index}`} item={reference} fallbackLabel={`Guidance ${index + 1}`} />)}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Resolution note</span>
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Describe what you changed so this resolution can help with future incidents."
            className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <div className="flex items-end gap-2 lg:flex-col lg:justify-end">
          <button type="button" onClick={onSaveNote} disabled={savingNote} className="btn-secondary flex-1 lg:w-full">
            {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save note
          </button>
          <button type="button" onClick={onVerify} disabled={verifying} className="btn-primary flex-1 lg:w-full">
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {verifying ? "Verifying…" : "Verify fix"}
          </button>
        </div>
      </div>

      {verification && (
        <div className={`mt-4 rounded-xl border p-4 ${verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className={`flex items-center gap-2 text-sm font-bold ${verified ? "text-emerald-800" : "text-amber-800"}`}>
            {verified ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {verified ? "Recovery confirmed by a fresh check" : "Issue still needs attention"}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{verification.message ?? verification.summary ?? "Verification result recorded."}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
            {verification.scoreBefore !== undefined && <span>Before: {verification.scoreBefore}/100</span>}
            {verification.scoreAfter !== undefined && <span>After: {verification.scoreAfter}/100</span>}
            {formatDate(verification.verifiedAt) && <span>{formatDate(verification.verifiedAt)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
