import { after } from "next/server";
import { drainAlertOutbox } from "@/lib/alert-outbox";
import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { readObject } from "@/lib/request";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { normalizeDomain, parseScanOptions } from "@/lib/dns-check";
import { runMonitoredCheck } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/check — add a domain to monitoring and run the baseline scan.
 * DeliveryWatch is 100% free: no plan limits.
 */
export async function POST(req: Request) {
  try {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const limited = await rateLimit("add-domain", user.id, 10);
  if (limited) return limited;

  const body = await readObject(req);
  if (body instanceof Response) return body;

  const domain = normalizeDomain(body.domain ?? "");
  if (!domain) return Response.json({ error: "Please enter a valid domain like example.com" }, { status: 400 });

  let options;
  try { options = parseScanOptions(body); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }

  const [existing] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.userId, user.id), eq(domains.domain, domain)))
    .limit(1);

  if (existing) {
    return Response.json({ error: "You are already monitoring this domain.", domainId: existing.id }, { status: 409 });
  }

  const [created] = await db.insert(domains).values({ userId: user.id, domain, scanOptions: options }).onConflictDoNothing().returning();

  if (!created) return Response.json({ error: "This domain is already being monitored." }, { status: 409 });

  try {
    const outcome = await runMonitoredCheck({
      domainId: created.id,
      domainName: domain,
      userId: user.id,
      isInitial: true,
      sendAlerts: true,
    });

    after(async () => { await drainAlertOutbox(3, user.id).catch(error => console.error("[outbox] deferred delivery failed", error)); });
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

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
