"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Bell,
  Globe,
  Shield,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Smartphone,
  Mail,
  Clock,
  Zap,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Step definitions
   ───────────────────────────────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    title: "Add your sending domains",
    body: "Paste any domain you send campaigns from. We run a deep DNS diagnostic baseline in under 5 seconds — SPF, DKIM, DMARC, MX and 8 blacklists.",
  },
  {
    n: "02",
    title: "We watch every 15 minutes",
    body: "Our workers re-query your DNS records around the clock. The instant anything changes — a deleted SPF include, a new blacklisting, a DKIM key rotation — we diff and flag it.",
  },
  {
    n: "03",
    title: "Get alerted immediately",
    body: "Blacklisted? Score dropped? Receive a push notification on WhatsApp, a Slack ping in your team channel, or an email — before your next campaign sends.",
  },
];

/* ─────────────────────────────────────────────────────────────────
   Scroll mapping:
   We want deliberate REST zones where the user can comfortably read,
   and smooth TRANSITION zones where the right panel slides cleanly.
   
   Zone breakdown across progress p ∈ [0, 1]:
     • 0.00 → 0.28 : Rest on Step 0 (pos = 0)
     • 0.28 → 0.40 : Transition 0 → 1 (pos slides 0 → 1)
     • 0.40 → 0.68 : Rest on Step 1 (pos = 1)
     • 0.68 → 0.80 : Transition 1 → 2 (pos slides 1 → 2)
     • 0.80 → 1.00 : Rest on Step 2 (pos = 2)
   ───────────────────────────────────────────────────────────────── */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function getMappedPosition(p: number): number {
  if (p <= 0.28) {
    return 0;
  }
  if (p <= 0.40) {
    const t = (p - 0.28) / (0.40 - 0.28);
    return smoothstep(t);
  }
  if (p <= 0.68) {
    return 1;
  }
  if (p <= 0.80) {
    const t = (p - 0.68) / (0.80 - 0.68);
    return 1 + smoothstep(t);
  }
  return 2;
}

function getActiveStep(pos: number): number {
  // Switch active step at the exact midpoint of transitions (0.5 and 1.5)
  if (pos < 0.5) return 0;
  if (pos < 1.5) return 1;
  return 2;
}

/* ─────────────────────────────────────────────────────────────────
   Mock UI Panels
   ───────────────────────────────────────────────────────────────── */
function Panel1() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F372E] text-white">
          <Globe className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">Add Domains</div>
          <div className="text-xs text-slate-500">Start monitoring in seconds</div>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Domain name</label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <div className="flex h-11 items-center rounded-xl border border-[#0F372E] bg-white pl-10 pr-4 text-sm font-medium text-slate-800 shadow-[0_0_0_3px_rgba(15,55,46,0.08)]">
            acme-outreach.com
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {[
          { label: "SPF record",     status: "✓ found",    ok: true },
          { label: "DKIM selector",  status: "✓ detected", ok: true },
          { label: "DMARC policy",   status: "scanning…",  ok: false },
          { label: "MX records",     status: "resolving…", ok: false },
          { label: "Blacklists (8)", status: "querying…",  ok: false },
        ].map((r) => (
          <div key={r.label} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-xs font-semibold text-slate-700">{r.label}</span>
            <span className={`text-xs font-bold ${r.ok ? "text-emerald-700" : "text-slate-400"}`}>{r.status}</span>
          </div>
        ))}
      </div>
      <button type="button" className="btn-primary w-full pointer-events-none">
        <Zap className="h-4 w-4" />
        <span>Start Monitoring</span>
      </button>
    </div>
  );
}

function Panel2() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Live DNS Watch</div>
            <div className="text-xs text-slate-500">acme-outreach.com</div>
          </div>
        </div>
        <span className="badge-healthy flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-[#0F372E] px-6 py-5 text-white">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-300">Deliverability Score</div>
          <div className="mt-1 text-4xl font-black">96<span className="text-xl font-semibold text-emerald-300">/100</span></div>
        </div>
        <Shield className="h-12 w-12 text-emerald-400 opacity-60" />
      </div>
      <div className="flex-1 space-y-2">
        {[
          { label: "SPF",        detail: "v=spf1 include:_spf.google.com ~all" },
          { label: "DKIM",       detail: "google._domainkey — RSA 2048-bit" },
          { label: "DMARC",      detail: "p=quarantine; pct=100" },
          { label: "MX",         detail: "aspmx.l.google.com (priority 1)" },
          { label: "Blacklists", detail: "0 / 8 databases flagged" },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900">{c.label} </span>
              <span className="truncate text-[10px] text-slate-500">{c.detail}</span>
            </div>
            <span className="ml-auto shrink-0 text-[10px] font-bold text-emerald-700">Pass</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
        <Clock className="mr-1.5 inline h-3.5 w-3.5" />
        Next scan in <strong>12 min 44 sec</strong>
      </div>
    </div>
  );
}

function Panel3() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">Alert Channels</div>
          <div className="text-xs text-slate-500">Notify your team instantly</div>
        </div>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <span className="text-xs font-bold text-red-900">Blacklist detected — Spamhaus</span>
        </div>
        <div className="mt-1 text-[11px] text-red-600">growth-reach.co · detected 2 min ago</div>
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">WhatsApp</div>
            <div className="text-[11px] text-slate-600">🚨 growth-reach.co blacklisted on Spamhaus!</div>
          </div>
          <span className="ml-auto badge-healthy shrink-0">Sent</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4A154B] text-white">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">Slack — #deliverability</div>
            <div className="text-[11px] text-slate-600">⚠️ Domain alert: growth-reach.co flagged</div>
          </div>
          <span className="ml-auto badge-healthy shrink-0">Sent</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">Email</div>
            <div className="text-[11px] text-slate-600">Action required: blacklist detected</div>
          </div>
          <span className="ml-auto badge-healthy shrink-0">Sent</span>
        </div>
      </div>
    </div>
  );
}

const PANELS = [Panel1, Panel2, Panel3];

/* ─────────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────────── */
export function StickyScroll({ isAuthenticated }: { isAuthenticated: boolean }) {
  const sectionRef      = useRef<HTMLDivElement>(null);
  const rightTrackRef   = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const updatePositions = useCallback(() => {
    const section = sectionRef.current;
    const track   = rightTrackRef.current;
    if (!section || !track) return;

    const rect = section.getBoundingClientRect();
    const totalScrollable = section.offsetHeight - window.innerHeight;
    if (totalScrollable <= 0) return;

    const scrolled = -rect.top;
    const p = Math.max(0, Math.min(1, scrolled / totalScrollable));

    // Map progress → panel position float (0 to 2)
    const pos = getMappedPosition(p);

    // Each panel is (100 / STEPS.length)% of the track.
    // To shift by `pos` panels, translate by (-pos / STEPS.length) * 100%.
    const translateY = (-pos / STEPS.length) * 100;
    track.style.transform = `translate3d(0, ${translateY}%, 0)`;

    // Update active step (switches right at the transition midpoint)
    const newActive = getActiveStep(pos);
    setActive(newActive);
  }, []);

  const scrollToStep = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const totalScrollable = section.offsetHeight - window.innerHeight;
    const sectionTop = window.scrollY + section.getBoundingClientRect().top;
    // Target the center of each step's rest zone:
    const stepCenters = [0.14, 0.54, 0.90];
    const targetScrollY = sectionTop + totalScrollable * stepCenters[index];
    window.scrollTo({ top: targetScrollY, behavior: "smooth" });
  };

  useEffect(() => {
    let rafId: number;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePositions);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updatePositions, { passive: true });
    updatePositions(); // initial layout

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updatePositions);
      cancelAnimationFrame(rafId);
    };
  }, [updatePositions]);

  return (
    <section
      ref={sectionRef}
      id="how"
      className="scroll-mt-24"
      style={{ height: `${STEPS.length * 105}vh` }}
    >
      {/* Sticky viewport — stays pinned while the section scrolls behind */}
      <div className="sticky top-0 flex h-screen items-center">
        <div
          className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-2"
          style={{ paddingTop: "5rem", paddingBottom: "4rem" }}
        >

          {/* ── LEFT: steps list — click to navigate, active indicator updates in sync ── */}
          <div className="flex flex-col">
            <div className="eyebrow mb-4 text-[#0F372E]">Simple 3-Step Setup</div>
            <h2 className="font-display mb-10 text-3xl font-bold tracking-tight text-[#0B1311] sm:text-4xl">
              Three steps. Zero invoices.
            </h2>

            <ol className="space-y-1">
              {STEPS.map((s, i) => {
                const isActive = active === i;
                return (
                  <li
                    key={s.n}
                    onClick={() => scrollToStep(i)}
                    className={`group/step flex cursor-pointer gap-6 border-l-2 py-6 pl-7 rounded-r-2xl transition-all duration-300 ${
                      isActive
                        ? "border-[#0F372E] bg-emerald-50/40"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <span className={`font-display shrink-0 text-sm font-black transition-colors duration-300 ${
                      isActive ? "text-[#0F372E]" : "text-slate-300 group-hover/step:text-slate-400"
                    }`}>
                      {s.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`font-display text-[1.1rem] font-bold leading-snug transition-colors duration-300 ${
                        isActive ? "text-[#0B1311]" : "text-slate-400 group-hover/step:text-slate-600"
                      }`}>
                        {s.title}
                      </div>
                      <div className={`mt-2 overflow-hidden text-sm leading-relaxed text-slate-600 transition-all duration-300 ${
                        isActive ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                      }`}>
                        {s.body}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 pl-7">
              <Link href={isAuthenticated ? "/dashboard" : "/login?mode=signup"} className="btn-primary group">
                <span>{isAuthenticated ? "Go to Dashboard" : "Create Free Account"}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* ── RIGHT: clipped window — inner track moves up via rAF ── */}
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{ height: "min(520px, calc(100vh - 10rem))" }}
          >
            {/*
              The track is 3× the container height.
              transform is updated directly via ref in sync with scroll progress.
              No CSS transition to avoid fighting Lenis smooth-scroll.
            */}
            <div
              ref={rightTrackRef}
              style={{
                height: `${STEPS.length * 100}%`,
                display: "flex",
                flexDirection: "column",
                willChange: "transform",
              }}
            >
              {PANELS.map((Panel, i) => (
                <div
                  key={i}
                  style={{
                    height: `${100 / STEPS.length}%`,
                    flexShrink: 0,
                  }}
                  className="h-full w-full p-1"
                >
                  <Panel />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

