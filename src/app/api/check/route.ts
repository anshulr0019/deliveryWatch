import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { normalizeDomain } from "@/lib/dns-check";
import { runMonitoredCheck } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/check — add a domain to monitoring and run the baseline scan.
 * DeliverWatch is 100% free: no plan limits.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const domain = normalizeDomain(body.domain ?? "");
  if (!domain) return Response.json({ error: "Please enter a valid domain like example.com" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.userId, user.id), eq(domains.domain, domain)))
    .limit(1);

  if (existing) {
    return Response.json({ error: "You are already monitoring this domain.", domainId: existing.id }, { status: 409 });
  }

  const [created] = await db.insert(domains).values({ userId: user.id, domain }).returning();

  try {
    const outcome = await runMonitoredCheck({
      domainId: created.id,
      domainName: domain,
      userId: user.id,
      isInitial: true,
      sendAlerts: true,
    });

    return Response.json({
      domainId: created.id,
      domain,
      score: outcome.result.totalScore,
      grade: outcome.result.grade,
      tier: outcome.result.tier,
      result: outcome.result,
      events: outcome.events,
    });
  } catch (err) {
    console.error("[check] initial scan failed", err);
    // Roll back the domain so the user can retry cleanly.
    await db.delete(domains).where(eq(domains.id, created.id)).catch(() => undefined);
    return Response.json({ error: "Scan failed. Please try again." }, { status: 500 });
  }
}
