import { eq } from "drizzle-orm";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { runMonitoredCheck } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 10;
const PER_DOMAIN_TIMEOUT_MS = 25_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Without a configured secret, only allow in non-production (local dev / sandbox).
    return process.env.NODE_ENV !== "production" || process.env.ALLOW_UNPROTECTED_CRON === "true";
  }
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

/**
 * GET|POST /api/cron/check-all — scheduled monitoring sweep.
 * Protected with `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends this automatically).
 */
async function handler(req: Request) {
  if (!isAuthorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const started = Date.now();
  const active = await db.select().from(domains).where(eq(domains.isActive, true));

  const summary = {
    total: active.length,
    checked: 0,
    failed: 0,
    eventsCreated: 0,
    alertsTriggered: 0,
    failures: [] as { domain: string; error: string }[],
  };

  for (let i = 0; i < active.length; i += BATCH_SIZE) {
    const batch = active.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((d) =>
        withTimeout(
          runMonitoredCheck({ domainId: d.id, domainName: d.domain, userId: d.userId, sendAlerts: true }),
          PER_DOMAIN_TIMEOUT_MS,
        ),
      ),
    );

    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        summary.checked += 1;
        summary.eventsCreated += r.value.events.length;
        summary.alertsTriggered += r.value.events.filter((e) => e.severity !== "info").length;
      } else {
        summary.failed += 1;
        summary.failures.push({ domain: batch[idx].domain, error: r.reason instanceof Error ? r.reason.message : String(r.reason) });
      }
    });
  }

  return Response.json({ ok: true, ...summary, durationMs: Date.now() - started, ranAt: new Date().toISOString() });
}

export { handler as GET, handler as POST };
