import type { Metadata } from "next";
import { and, desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { checks, domains, events } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { DomainDetail, type CheckPoint, type TimelineEvent } from "@/components/dashboard/DomainDetail";
import type { MailScoreResult, SpfResult, DkimResult, DmarcResult, MxResult, RblResult } from "@/lib/dns-check";
import { gradeFor, tierFor } from "@/lib/dns-check";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Domain — DeliveryWatch" };
  const user = await requireUser();
  const [row] = await db.select({ domain: domains.domain }).from(domains).where(and(eq(domains.id, id), eq(domains.userId, user.id))).limit(1);
  return {
    title: row ? `${row.domain} — DeliveryWatch` : "Domain — DeliveryWatch",
    description: row ? `Deliverability monitoring and DNS health for ${row.domain}.` : "Domain monitoring details.",
  };
}

export default async function DomainPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [domain] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, id), eq(domains.userId, user.id)))
    .limit(1);
  if (!domain) notFound();

  const [history, timeline] = await Promise.all([
    db.select().from(checks).where(and(eq(checks.domainId, id), sql`${checks.checkedAt} >= now() - interval '90 days'`)).orderBy(desc(checks.checkedAt)),
    db.select().from(events).where(eq(events.domainId, id)).orderBy(desc(events.createdAt)).limit(200),
  ]);

  const latest = history[0];
  const latestResult: MailScoreResult | null = latest
    ? {
        domain: domain.domain,
        totalScore: latest.score,
        grade: gradeFor(latest.score),
        tier: tierFor(latest.score),
        complete: [latest.spfStatus, latest.dkimStatus, latest.dmarcStatus, latest.mxStatus, latest.rblStatus].every(s => s !== "unknown"),
        spf: latest.spfDetails as SpfResult,
        dkim: latest.dkimDetails as DkimResult,
        dmarc: latest.dmarcDetails as DmarcResult,
        mx: latest.mxDetails as MxResult,
        rbl: latest.rblDetails as RblResult,
        scannedAt: latest.checkedAt.toISOString(),
        scanDurationMs: 0,
      }
    : null;

  const points: CheckPoint[] = history
    .slice()
    .reverse()
    .map((c) => ({
      t: c.checkedAt.toISOString(),
      score: c.score,
      spf: c.spfStatus,
      dkim: c.dkimStatus,
      dmarc: c.dmarcStatus,
      mx: c.mxStatus,
      rbl: c.rblStatus,
    }));

  const evs: TimelineEvent[] = timeline.map((e) => ({
    id: e.id,
    type: e.type,
    severity: e.severity,
    title: e.title,
    description: e.description,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <DomainDetail
      domain={{
        id: domain.id,
        domain: domain.domain,
        isActive: domain.isActive,
        latestScore: domain.latestScore,
        lastCheckedAt: domain.lastCheckedAt ? domain.lastCheckedAt.toISOString() : null,
        createdAt: domain.createdAt.toISOString(),
      }}
      latestResult={latestResult}
      history={points}
      events={evs}
    />
  );
}
