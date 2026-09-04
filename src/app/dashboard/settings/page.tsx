import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ArrowRight, Bell, Clock, Globe, Infinity as InfinityIcon, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { alertChannels, checks, domains } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  const [[d], [c], [ch]] = await Promise.all([
    db.select({ n: count() }).from(domains).where(eq(domains.userId, user.id)),
    db.select({ n: count() }).from(checks).innerJoin(domains, eq(checks.domainId, domains.id)).where(eq(domains.userId, user.id)),
    db.select({ n: count() }).from(alertChannels).where(eq(alertChannels.userId, user.id)),
  ]);

  const cronConfigured = Boolean(process.env.CRON_SECRET);

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">Settings</div>
        <h1 className="font-display mt-1 text-3xl font-semibold text-white">Account</h1>
        <p className="mt-1 text-sm text-muted">Your profile, plan and monitoring configuration.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SpotlightCard>
          <div className="p-6">
            <h2 className="font-display text-base font-semibold text-white">Profile</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
                <dt className="text-muted">Name</dt>
                <dd className="text-white">{user.fullName || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
                <dt className="text-muted">Email</dt>
                <dd className="truncate text-white">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
                <dt className="text-muted">Member since</dt>
                <dd className="text-white">{format(new Date(user.createdAt), "MMM d, yyyy")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Plan</dt>
                <dd>
                  <span className="rounded-full border border-gold/30 bg-gold/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light">Community · Free forever</span>
                </dd>
              </div>
            </dl>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="p-6">
            <h2 className="font-display text-base font-semibold text-white">Your plan includes</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              {[
                { icon: InfinityIcon, text: "Unlimited monitored domains" },
                { icon: Clock, text: "Automatic re-checks every 15 minutes" },
                { icon: ShieldCheck, text: "SPF, DKIM, DMARC, MX + 8 blacklists" },
                { icon: Bell, text: "Unlimited WhatsApp, Slack, email & webhook alerts" },
                { icon: Globe, text: "Full history & change timeline, forever" },
              ].map((i) => (
                <li key={i.text} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/25 bg-gold/[0.06]">
                    <i.icon className="h-3.5 w-3.5 text-gold-light" />
                  </span>
                  {i.text}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-2">There is no paid tier. DeliverWatch is 100% free for everyone.</p>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="p-6">
            <h2 className="font-display text-base font-semibold text-white">Usage</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Domains", value: d.n },
                { label: "Snapshots", value: c.n },
                { label: "Channels", value: ch.n },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
                  <div className="font-display text-2xl font-semibold text-gold-gradient">{s.value}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.15em] text-muted-2">{s.label}</div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/alerts" className="btn-ghost mt-5 w-full">
              Manage alert channels <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="p-6">
            <h2 className="font-display text-base font-semibold text-white">Monitoring schedule</h2>
            <p className="mt-2 text-sm text-muted">
              The sweep runs at <code className="rounded bg-black/40 px-1.5 py-0.5 text-gold-light">/api/cron/check-all</code> every 15 minutes (see <code className="rounded bg-black/40 px-1.5 py-0.5 text-gold-light">vercel.json</code>).
            </p>
            <div className={`mt-4 rounded-xl border px-4 py-3 text-xs ${cronConfigured ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200" : "border-gold/25 bg-gold/[0.05] text-gold-light"}`}>
              {cronConfigured ? (
                <>
                  <strong>CRON_SECRET is configured.</strong> Scheduled runs are authenticated with <code>Authorization: Bearer …</code>.
                </>
              ) : (
                <>
                  <strong>CRON_SECRET is not set.</strong> Set it in production so only your scheduler can trigger sweeps. Manual re-checks from the dashboard always work.
                </>
              )}
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
