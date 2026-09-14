import Link from "next/link";
import { and, count, eq, inArray } from "drizzle-orm";
import { format } from "date-fns";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Infinity as InfinityIcon,
  Server,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { db } from "@/db";
import { alertChannels, checks, domains } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings — DeliveryWatch",
  description: "Manage your DeliveryWatch account, plan details, alert channels, and monitoring configuration.",
};

export default async function SettingsPage() {
  const user = await requireUser();

  const [[d], [c], [ch]] = await Promise.all([
    db.select({ n: count() }).from(domains).where(eq(domains.userId, user.id)),
    db.select({ n: count() }).from(checks).innerJoin(domains, eq(checks.domainId, domains.id)).where(eq(domains.userId, user.id)),
    db.select({ n: count() }).from(alertChannels).where(and(eq(alertChannels.userId, user.id), inArray(alertChannels.type, ["email", "slack", "webhook"]))),
  ]);

  const cronConfigured = Boolean(process.env.CRON_SECRET);

  const userInitials = (user.fullName || user.email)
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="eyebrow text-[#0F372E]">Settings</div>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-[#0B1311]">Account & Configuration</h1>
        <p className="mt-1 text-sm text-slate-600">Your profile, plan details, system usage, and continuous monitoring configuration.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <SpotlightCard>
          <div className="p-6 sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-[#0F372E]">
                {userInitials || <UserIcon className="h-5 w-5 text-[#0F372E]" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-bold text-[#0B1311]">Profile & Account</h2>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <span className="badge-healthy text-[10px] font-bold uppercase tracking-[0.14em]">
                Active
              </span>
            </div>

            <dl className="mt-5 space-y-3.5 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500 font-medium">Full name</dt>
                <dd className="font-semibold text-slate-900">{user.fullName || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500 font-medium">Email address</dt>
                <dd className="truncate font-semibold text-slate-900" title={user.email}>{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500 font-medium">Member since</dt>
                <dd className="font-semibold text-slate-900">{format(new Date(user.createdAt), "MMMM d, yyyy")}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 font-medium">Current plan</dt>
                <dd>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Community · Free forever
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </SpotlightCard>

        {/* Plan Inclusions Card */}
        <SpotlightCard>
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-base font-bold text-[#0B1311]">Community Plan Features</h2>
                <p className="mt-0.5 text-xs text-slate-500">All features included at zero cost</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                100% Free
              </span>
            </div>

            <ul className="mt-5 space-y-3.5 text-sm text-slate-700">
              {[
                { icon: InfinityIcon, text: "Unlimited monitored domains" },
                { icon: Clock, text: "Automatic daily re-checks" },
                { icon: ShieldCheck, text: "SPF, DKIM, DMARC, MX + 7 blacklists" },
                { icon: Bell, text: "Unlimited Slack, email & webhook alerts" },
                { icon: Globe, text: "Full history & change timeline, forever" },
              ].map((i) => (
                <li key={i.text} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-[#0F372E]">
                    <i.icon className="h-3.5 w-3.5 text-[#0F372E]" />
                  </span>
                  <span className="font-medium text-slate-800">{i.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
              <span className="font-bold">No hidden tiers or limits:</span> DeliveryWatch is built for founders and senders who need continuous deliverability monitoring without paywalls.
            </div>
          </div>
        </SpotlightCard>

        {/* Usage Card */}
        <SpotlightCard>
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-base font-bold text-[#0B1311]">Current Usage</h2>
                <p className="mt-0.5 text-xs text-slate-500">Live resources monitored in your account</p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F372E] hover:underline"
              >
                View all <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Domains", value: d.n },
                { label: "Snapshots", value: c.n },
                { label: "Channels", value: ch.n },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 transition hover:border-emerald-300 hover:bg-slate-50"
                >
                  <div className="font-display text-2xl font-extrabold text-[#0B1311]">{s.value}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            <Link href="/dashboard/alerts" className="btn-secondary mt-6 w-full !h-10 text-xs font-semibold">
              Manage alert channels <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </SpotlightCard>

        {/* Monitoring Schedule Card */}
        <SpotlightCard>
          <div className="p-6 sm:p-7">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-[#0B1311]">Monitoring Scheduler</h2>
                <p className="text-xs text-slate-500">Automated background sweep frequency</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              The automated sweep worker polls at{" "}
              <code className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-[#0F372E]">
                /api/cron/check-all
              </code>{" "}
              once daily at 00:00 UTC (defined in{" "}
              <code className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-[#0F372E]">
                vercel.json
              </code>
              ).
            </p>

            <div
              className={`mt-5 rounded-xl border p-4 text-xs ${
                cronConfigured
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                  : "border-amber-200 bg-amber-50/90 text-amber-950"
              }`}
            >
              {cronConfigured ? (
                <div>
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                    </span>
                    CRON_SECRET is configured & secured
                  </div>
                  <p className="mt-1 text-slate-700">
                    Scheduled runs are authenticated with{" "}
                    <code className="rounded border border-emerald-200 bg-white/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-900">
                      Authorization: Bearer …
                    </code>
                    .
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    CRON_SECRET is not configured
                  </div>
                  <p className="mt-1 text-slate-700">
                    Set it in your production environment variables so only authorized cron schedulers can trigger sweeps.
                    Manual re-checks from the dashboard remain active at all times.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
