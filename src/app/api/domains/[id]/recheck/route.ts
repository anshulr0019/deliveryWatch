import { after } from "next/server";
import { drainAlertOutbox } from "@/lib/alert-outbox";
import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { runMonitoredCheck, CheckBusyError } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/domains/[id]/recheck — manual re-scan with change detection + alerts. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const limited = await rateLimit("recheck", user.id, 10);
  if (limited) return limited;

  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const [domain] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, id), eq(domains.userId, user.id)))
    .limit(1);
  if (!domain) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const outcome = await runMonitoredCheck({
      domainId: domain.id,
      domainName: domain.domain,
      userId: user.id,
      sendAlerts: true,
    });

    after(async () => { await drainAlertOutbox(3, user.id).catch(error => console.error("[outbox] deferred delivery failed", error)); });
    return Response.json({
      domainId: domain.id,
      score: outcome.result.totalScore,
      previousScore: outcome.previousScore,
      grade: outcome.result.grade,
      result: outcome.result,
      events: outcome.events,
    });
  } catch (err) {
    if (err instanceof CheckBusyError) return Response.json({ error: err.message }, { status: 409 });
    console.error("[recheck] failed", err);
    return Response.json({ error: "Re-check failed. Please try again." }, { status: 500 });
  }

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
