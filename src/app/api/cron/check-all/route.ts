import { asc, eq, and, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { runMonitoredCheck, CheckBusyError } from "@/lib/monitor";
import { drainAlertOutbox } from "@/lib/alert-outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handler(req: Request) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const started = Date.now();
  const summary = { checked: 0, failed: 0, skipped: 0, remaining: false, alerts: { sent: 0, failed: 0, retried: 0 } };
  try {
    // Check one bounded batch at a time. Per-domain leases and due times survive restarts.
    while (Date.now() - started < 180000) {
      const due = await db.select().from(domains).where(and(eq(domains.isActive, true), sql`${domains.nextCheckAt} <= now() AND (${domains.checkLeaseUntil} IS NULL OR ${domains.checkLeaseUntil} < now())`)).orderBy(asc(domains.nextCheckAt)).limit(5);
      if (!due.length) break;
      const outcomes = await Promise.allSettled(due.map(d => runMonitoredCheck({ domainId: d.id, domainName: d.domain, userId: d.userId, scheduled: true })));
      for (const r of outcomes) { if (r.status === "fulfilled") summary.checked++; else if (r.reason instanceof CheckBusyError) summary.skipped++; else summary.failed++; }
    }
    const remaining = await db.select({ id: domains.id }).from(domains).where(and(eq(domains.isActive, true), sql`${domains.nextCheckAt} <= now()`)).limit(1);
    summary.remaining = remaining.length > 0;
    summary.alerts = await drainAlertOutbox(100, undefined, started + 270000);
    await db.execute(sql`DELETE FROM rate_limits WHERE expires_at < now() - interval '1 day'`);
    await db.execute(sql`DELETE FROM sessions WHERE expires_at < now()`);
    return Response.json({ ok: summary.failed === 0, ...summary, durationMs: Date.now() - started }, { status: summary.failed ? 207 : 200 });
  } catch (error) {
    console.error("[cron] sweep failed", error);
    return Response.json({ error: "Monitoring sweep failed.", ...summary }, { status: 503 });
  }
}
export { handler as GET, handler as POST };
