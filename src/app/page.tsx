import Link from "next/link";
import { Activity, ArrowRight, Bell, GitCompareArrows, Infinity as InfinityIcon, LineChart, ShieldAlert, Sparkles } from "lucide-react";
import { Header } from "@/components/mailscore/Header";
import { Footer } from "@/components/mailscore/Footer";
import { ScannerHero } from "@/components/mailscore/ScannerHero";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Activity,
    title: "24/7 Monitoring",
    body: "Every domain is re-scanned automatically every 15 minutes — SPF, DKIM, DMARC, MX and 8 blacklists — without you lifting a finger.",
  },
  {
    icon: Bell,
    title: "WhatsApp & Slack Alerts",
    body: "The moment something breaks you get pinged where you actually look: WhatsApp, Slack, email or a signed webhook.",
  },
  {
    icon: LineChart,
    title: "Historical Score Trends",
    body: "See your deliverability score over 7, 30 and 90 days. Spot slow degradation before it becomes a spam-folder crisis.",
  },
  {
    icon: ShieldAlert,
    title: "Blacklist Watchdog",
    body: "Spamhaus, Barracuda, SpamCop, SORBS, UCEPROTECT, PSBL, DroneBL and CBL — checked on every run, with critical alerts on listing.",
  },
  {
    icon: GitCompareArrows,
    title: "DNS Change Detection",
    body: "A colleague edits the SPF record, a provider rotates DKIM keys, DMARC drops to p=none — we diff every snapshot and tell you.",
  },
  {
    icon: InfinityIcon,
    title: "100% Free Forever",
    body: "Unlimited domains, unlimited history, unlimited alerts. No credit card, no trial clock, no upsell. Community edition is the only edition.",
  },
];

const STEPS = [
  { n: "01", title: "Add your domains", body: "Paste any domain you send from. We run a baseline scan instantly and start the clock." },
  { n: "02", title: "We watch, continuously", body: "Every 15 minutes we re-check everything and compare against the previous snapshot." },
  { n: "03", title: "You get alerted first", body: "Blacklisted? Score dropped 15+? DKIM vanished? You know before your customers do." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const isAuthenticated = Boolean(user);

  return (
    <>
      <Header isAuthenticated={isAuthenticated} />

      <main className="relative">
        {/* HERO */}
        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="fade-up mx-auto inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.06] px-4 py-1.5 text-xs text-gold-light">
              <Sparkles className="h-3.5 w-3.5" />
              Continuous Deliverability & Blacklist Monitoring — 100% Free
            </div>
            <h1 className="font-display fade-up mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl" style={{ animationDelay: "80ms" }}>
              Your domains are getting blacklisted. <span className="text-gold-gradient">You just don&apos;t know it yet.</span>
            </h1>
            <p className="fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "160ms" }}>
              DeliverWatch runs real DNS checks on your SPF, DKIM, DMARC, MX and 8 blacklists around the clock, keeps a history of every change, and alerts you on WhatsApp, Slack
              or email the second something breaks.
            </p>
            <div className="fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
              <Link href={isAuthenticated ? "/dashboard" : "/login?mode=signup"} className="btn-gold w-full sm:w-auto">
                {isAuthenticated ? "Open Dashboard" : "Start Monitoring Free"} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#check" className="btn-ghost w-full sm:w-auto">
                Try Instant Checker
              </a>
            </div>
            <div className="fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-2" style={{ animationDelay: "320ms" }}>
              <span>✓ No credit card</span>
              <span>✓ Unlimited domains</span>
              <span>✓ Re-checks every 15 min</span>
              <span>✓ Open DNS engine</span>
            </div>
          </div>
        </section>

        {/* INSTANT CHECKER (lead magnet) */}
        <ScannerHero isAuthenticated={isAuthenticated} />

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-28 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow">Everything MailScore did — now on autopilot</div>
            <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">Monitoring built for people who send email that matters</h2>
            <p className="mt-4 text-muted">One-off checks tell you where you were. DeliverWatch tells you the moment things change.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <SpotlightCard key={f.title} className="h-full">
                <div className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/30 bg-gradient-to-br from-gold/15 to-transparent">
                    <f.icon className="h-5 w-5 text-gold-light" />
                  </div>
                  <h3 className="font-display mt-5 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-28 sm:px-6">
          <SpotlightCard className="p-1" borderGlowColor="rgba(200, 169, 110, 0.35)">
            <div className="rounded-[14px] bg-[#0B0D12]/80 p-8 sm:p-12">
              <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
                <div>
                  <div className="eyebrow">How it works</div>
                  <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">Three steps. Zero invoices.</h2>
                  <p className="mt-4 text-muted">
                    The engine behind the free checker is the same one that monitors your domains. The only difference: it never stops, and it remembers.
                  </p>
                  <Link href={isAuthenticated ? "/dashboard" : "/login?mode=signup"} className="btn-gold mt-8">
                    {isAuthenticated ? "Go to Dashboard" : "Create free account"} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <ol className="space-y-4">
                  {STEPS.map((s) => (
                    <li key={s.n} className="flex gap-5 rounded-2xl border border-white/[0.06] bg-black/30 p-5">
                      <span className="font-display text-2xl font-semibold text-gold-gradient">{s.n}</span>
                      <div>
                        <div className="font-medium text-white">{s.title}</div>
                        <div className="mt-1 text-sm text-muted">{s.body}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </SpotlightCard>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-[radial-gradient(ellipse_at_top,rgba(200,169,110,0.18),transparent_60%),linear-gradient(180deg,#12151C,#0B0D12)] px-6 py-16 text-center sm:px-12">
            <div className="eyebrow">Free. Forever. Seriously.</div>
            <h2 className="font-display mx-auto mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-5xl">Stop finding out from your customers.</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">Add your first domain in under a minute. Get your first alert before your next campaign lands in spam.</p>
            <Link href={isAuthenticated ? "/dashboard" : "/login?mode=signup"} className="btn-gold mt-8">
              Start Monitoring Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
