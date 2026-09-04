import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Header } from "@/components/mailscore/Header";
import { Footer } from "@/components/mailscore/Footer";
import { ScannerHero } from "@/components/mailscore/ScannerHero";
import { ScrollReveal } from "@/components/mailscore/ScrollReveal";
import { Marquee } from "@/components/mailscore/Marquee";
import { StickyScroll } from "@/components/mailscore/StickyScroll";
import { PerspectiveGrid } from "@/components/mailscore/PerspectiveGrid";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Real cold-outreach tools used by the community
const LOGOS = [
  { name: "Smartlead.ai", icon: "⚡" },
  { name: "SalesHawk", icon: "🦅" },
  { name: "Instantly", icon: "🚀" },
  { name: "Lemlist", icon: "🍋" },
  { name: "Apollo.io", icon: "🎯" },
  { name: "Parabola", icon: "📊" },
  { name: "GrowthWave", icon: "🌊" },
  { name: "Mailreach", icon: "📬" },
  { name: "Woodpecker", icon: "🐦" },
  { name: "Snov.io", icon: "❄️" },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const isAuthenticated = Boolean(user);

  return (
    <>
      <Header isAuthenticated={isAuthenticated} />

      <main className="relative">
        {/* ── HERO SECTION ─────────────────────────────────────────── */}
        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-4xl text-center">

            {/* Testimonial pill — floats subtly */}
            <div className="hero-anim hero-anim-1 animate-float mx-auto inline-flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] transition hover:border-emerald-300">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                L
              </div>
              <span className="text-xs font-medium text-slate-700">
                &ldquo;No more domain burning&rdquo; —{" "}
                <span className="font-semibold text-slate-900">Luka, Founder @ Merryreach</span>
              </span>
              {/* Live status dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-anim hero-anim-2 font-display mt-6 text-4xl font-extrabold leading-[1.12] tracking-tight text-[#0B1311] sm:text-6xl sm:leading-[1.1]">
              Everything you need to{" "}
              <br className="hidden sm:inline" />
              <span className="text-gradient-pine">stay out of </span>
              <span className="relative inline-block px-1.5 align-baseline">
                <span className="font-extrabold text-red-600 tracking-tight">spam</span>
                {/* Red marker cut stroke */}
                <svg
                  className="pointer-events-none absolute -inset-x-2 top-1/2 -translate-y-1/2 h-7 w-[calc(100%+1rem)] overflow-visible z-20 select-none rotate-[-2deg]"
                  viewBox="0 0 120 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {/* Soft marker ink bleed */}
                  <path
                    d="M 4 18 C 28 11, 68 15, 116 10"
                    stroke="rgba(239, 68, 68, 0.25)"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Main bold red marker cut */}
                  <path
                    d="M 3 17 C 26 10, 66 14, 117 9"
                    stroke="#EF4444"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Darker red concentrated marker core */}
                  <path
                    d="M 6 16 C 30 11.5, 72 13, 114 9.5"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="hero-anim hero-anim-3 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Your domains are getting blacklisted. To land in primary, you need 24/7 continuous watch across SPF, DKIM, DMARC and 8 major blacklists — with zero manual work.
            </p>

            {/* 3 Checkmark Pills */}
            <div className="hero-anim hero-anim-4 mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-emerald-900 shadow-sm">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" /> 95% inbox delivery
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-emerald-900 shadow-sm">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" /> Ready in 10 min
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-emerald-900 shadow-sm">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" /> Zero manual work
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="hero-anim hero-anim-5 mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href={isAuthenticated ? "/dashboard" : "/login?mode=signup"}
                className="btn-primary group w-full sm:w-auto"
              >
                <span>{isAuthenticated ? "Open Dashboard" : "Start Monitoring Free"}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a
                href="#check"
                className="btn-secondary group w-full sm:w-auto"
              >
                <span>Try Instant Checker</span>
              </a>
            </div>
          </div>
        </section>

        {/* ── TRUST BAR — Infinite scrolling marquee ───────────────── */}
        <section className="border-y border-slate-200/70 bg-slate-50/60 py-7">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Teams using DeliverWatch alongside
            </p>
            <Marquee items={LOGOS} speed={55} gap={72} />
          </div>
        </section>

        {/* Shimmer divider */}
        <div className="divider-shimmer mx-auto max-w-5xl" />

        {/* ── INSTANT CHECKER ──────────────────────────────────────── */}
        <div className="pt-16">
          <ScannerHero isAuthenticated={isAuthenticated} />
        </div>

        {/* ── 8-CARD FEATURE GRID ──────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-28 sm:px-6">
          <ScrollReveal direction="up">
            <div className="mx-auto max-w-2xl text-center">
              <div className="eyebrow text-[#0F372E]">Continuous Monitoring</div>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-[#0B1311] sm:text-4xl">
                Infrastructure That Actually Delivers
              </h2>
              <p className="mt-4 text-base text-slate-600">
                One-off DNS tests tell you where you were yesterday. DeliverWatch guards your sender reputation 24/7 without manual maintenance.
              </p>
            </div>
          </ScrollReveal>

          <PerspectiveGrid />
        </section>

        {/* ── ALTERNATING SHOWCASE 1 ───────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Left: Mock UI Domain Management Card */}
            <ScrollReveal direction="left">
              <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 tilt-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="font-display text-base font-bold text-slate-900">Active Sending Domains</h4>
                    <p className="text-xs text-slate-500">Live health checks & blacklist status</p>
                  </div>
                  <span className="badge-healthy">All Systems Active</span>
                </div>

                {/* Mock domain rows */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">acme-outreach.com</div>
                        <div className="text-xs text-slate-500">Google Workspace · SPF + DKIM + DMARC</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="badge-healthy">98 / 100</span>
                      <div className="mt-0.5 text-[10px] text-slate-400">0 blacklists</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">sales-reach.io</div>
                        <div className="text-xs text-slate-500">Microsoft 365 · Strict alignment</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="badge-healthy">95 / 100</span>
                      <div className="mt-0.5 text-[10px] text-slate-400">0 blacklists</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 transition">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">growth-reach.co</div>
                        <div className="text-xs text-amber-700">DMARC policy warning · p=none</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="badge-warning">82 / 100</span>
                      <div className="mt-0.5 text-[10px] text-amber-600 font-semibold">1 fix required</div>
                    </div>
                  </div>
                </div>

                {/* Bottom stats banner */}
                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold">Next re-scan in 4m 12s</span>
                  </div>
                  <span className="text-xs text-slate-300">Auto-sync ON</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Right: Deep Pine Callout Card */}
            <ScrollReveal direction="right">
              <div className="card-pine p-8 sm:p-10 shadow-2xl">
                <div className="eyebrow text-emerald-300">Complete Automation</div>
                <h3 className="font-display mt-3 text-3xl font-extrabold text-white">
                  Set Up In Minutes, <br />Protected Forever
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-emerald-100/90 sm:text-base">
                  Simply paste your sending domains. DeliverWatch instantly audits your DNS architecture, validates SPF lookups against the 10-limit rule, and establishes a historical baseline.
                </p>

                <div className="mt-6 space-y-3.5 text-sm text-white">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                    <span><strong>Zero DNS technical skills required:</strong> Plain-English instructions for GoDaddy, Cloudflare, Namecheap and AWS Route53.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                    <span><strong>Instant multi-channel notifications:</strong> Receive WhatsApp and Slack pings before your sender reputation drops.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                    <span><strong>15-Minute continuous cycle:</strong> We catch DNS deletions and rogue SPF records long before manual weekly checks.</span>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    href={isAuthenticated ? "/dashboard" : "/login?mode=signup"}
                    className="btn-secondary !bg-white !text-[#0F372E] hover:!bg-emerald-50 font-bold"
                  >
                    <span>Start Monitoring Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── HOW IT WORKS — sticky scrollytelling ─────────────── */}
        <StickyScroll isAuthenticated={isAuthenticated} />

        {/* ── FINAL CTA SECTION ────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pt-28 pb-20 sm:px-6">
          <ScrollReveal direction="scale">
            <div className="relative overflow-hidden rounded-3xl bg-[#0F372E] px-6 py-16 text-center text-white shadow-2xl sm:px-12">
              {/* Subtle background glow */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.25)_0%,transparent_60%)]" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-1 text-xs font-bold text-emerald-200">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Free Forever · No Credit Card Required
                </div>
                <h2 className="font-display mx-auto mt-5 max-w-2xl text-3xl font-extrabold text-white sm:text-5xl">
                  Stop finding out from your customers.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base text-emerald-100/90">
                  Add your first domain in under 60 seconds. Get your first alert before your next campaign lands in the spam folder.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={isAuthenticated ? "/dashboard" : "/login?mode=signup"}
                    className="btn-secondary !bg-white !text-[#0F372E] hover:!bg-emerald-50 font-bold w-full sm:w-auto"
                  >
                    <span>Start Monitoring Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#check"
                    className="btn-secondary !border-emerald-500/40 !bg-white/10 !text-white hover:!bg-white/20 font-semibold w-full sm:w-auto"
                  >
                    <span>Instant Checker</span>
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <Footer />
    </>
  );
}
