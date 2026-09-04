import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { domains, events } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const user = await requireUser();
  const { add } = await searchParams;

  const rows = await db.select().from(domains).where(eq(domains.userId, user.id)).orderBy(desc(domains.createdAt));

  const domainIds = rows.map((d) => d.id);
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const recentEvents =
    domainIds.length > 0
      ? await db
          .select()
          .from(events)
          .where(and(inArray(events.domainId, domainIds), gte(events.createdAt, since)))
          .orderBy(desc(events.createdAt))
          .limit(50)
      : [];

  const activeAlerts = recentEvents.filter((e) => e.severity !== "info").length;
  const avg = rows.length ? Math.round(rows.reduce((s, d) => s + d.latestScore, 0) / rows.length) : 0;

  const domainNameById = new Map(rows.map((d) => [d.id, d.domain]));

  return (
    <DashboardOverview
      initialDomains={rows.map((d) => ({
        id: d.id,
        domain: d.domain,
        isActive: d.isActive,
        latestScore: d.latestScore,
        lastCheckedAt: d.lastCheckedAt ? d.lastCheckedAt.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
      }))}
      stats={{ count: rows.length, avg, activeAlerts }}
      recentEvents={recentEvents.slice(0, 8).map((e) => ({
        id: e.id,
        domainId: e.domainId,
        domain: domainNameById.get(e.domainId) ?? "",
        type: e.type,
        severity: e.severity,
        title: e.title,
        createdAt: e.createdAt.toISOString(),
      }))}
      prefillDomain={add ?? ""}
    />
  );
}
