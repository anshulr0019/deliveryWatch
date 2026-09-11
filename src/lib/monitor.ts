import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { alertChannels, alertDeliveries, checks, domains, events } from "@/db/schema";
import { checkDomain, type MailScoreResult, type ScanOptions } from "@/lib/dns-check";
import { detectDomainChanges, snapshotFromCheckRow, snapshotFromResult, type DetectedEvent } from "@/lib/change-detector";

export interface RunCheckOutcome { result: MailScoreResult; checkId: string; events: DetectedEvent[]; previousScore: number | null; }
export class CheckBusyError extends Error { constructor() { super("A check is already running. Try again shortly."); } }
export function toCheckRow(domainId: string, r: MailScoreResult) {
  return { domainId, score: r.totalScore, spfStatus: r.spf.status, spfDetails: r.spf, dkimStatus: r.dkim.status, dkimDetails: r.dkim, dmarcStatus: r.dmarc.status, dmarcDetails: r.dmarc, mxStatus: r.mx.status, mxDetails: r.mx, rblStatus: r.rbl.status, rblDetails: r.rbl, checkedAt: new Date(r.scannedAt) };
}
export async function runMonitoredCheck(opts: { domainId: string; domainName: string; userId: string; sendAlerts?: boolean; isInitial?: boolean; scheduled?: boolean }): Promise<RunCheckOutcome> {
  const token = randomUUID();
  const [claimed] = await db.update(domains).set({ checkLeaseToken: token, checkLeaseUntil: new Date(Date.now() + 90000), nextCheckAt: new Date(Date.now() + 15 * 60000) })
    .where(and(eq(domains.id, opts.domainId), eq(domains.userId, opts.userId), sql`(${domains.checkLeaseUntil} IS NULL OR ${domains.checkLeaseUntil} < now())`, opts.scheduled ? sql`${domains.isActive} = true AND ${domains.nextCheckAt} <= now()` : undefined)).returning();
  if (!claimed) throw new CheckBusyError();
  try {
    const result = await checkDomain(claimed.domain, claimed.scanOptions as ScanOptions);
    return await db.transaction(async tx => {
      // Ensure an expired lease cannot commit after another worker acquired the domain.
      const rows = await tx.execute(sql`SELECT id FROM domains WHERE id = ${claimed.id}::uuid AND check_lease_token = ${token}::uuid FOR UPDATE`);
      if (!rows.rows.length) throw new CheckBusyError();
      const [previous] = await tx.select().from(checks).where(eq(checks.domainId, claimed.id)).orderBy(desc(checks.checkedAt)).limit(1);
      const baseline = previous ? snapshotFromCheckRow(previous) : null;
      if (baseline) {
        // Carry forward the last successful observation for each unknown protocol across outages.
        for (const protocol of ["spf", "dkim", "dmarc", "mx", "rbl"] as const) {
          if (baseline[`${protocol}Status`] !== "unknown") continue;
          const [known] = await tx.select().from(checks).where(and(eq(checks.domainId, claimed.id), sql`${checks[`${protocol}Status`]} <> 'unknown'`)).orderBy(desc(checks.checkedAt)).limit(1);
          if (known) {
            const snapshot = snapshotFromCheckRow(known);
            const fields = { spf: ["spfRecord"], dkim: ["dkimFingerprint"], dmarc: ["dmarcRecord", "dmarcPolicy"], mx: ["mxRecords"], rbl: ["rblListedOn", "rblIp", "rblProviders"] }[protocol];
            Object.assign(baseline, { [`${protocol}Status`]: snapshot[`${protocol}Status`] }, Object.fromEntries(fields.map(f => [f, snapshot[f as keyof typeof snapshot]])));
          }
        }
        // Do not compare aggregate scores across an incomplete observation.
        if (Object.values({ spf: previous.spfStatus, dkim: previous.dkimStatus, dmarc: previous.dmarcStatus, mx: previous.mxStatus, rbl: previous.rblStatus }).includes("unknown")) baseline.score = result.totalScore;
      }
      const detected: DetectedEvent[] = baseline ? detectDomainChanges(baseline, snapshotFromResult(result), claimed.domain) : [{ type: "monitoring_started", severity: "info", title: "Monitoring started", description: `Baseline DNS scan recorded for ${claimed.domain}. Unavailable checks are marked unknown.` }];
      if (!previous && result.rbl.listedOn.length) detected.push({ type: "blacklist_added", severity: "critical", title: `Listed on ${result.rbl.listedOn.join(", ")}`, description: `Checked IP ${result.rbl.ip} is listed. Confirm it belongs to your sending infrastructure.` });
      const [inserted] = await tx.insert(checks).values(toCheckRow(claimed.id, result)).returning({ id: checks.id });
      const channels = opts.sendAlerts === false ? [] : await tx.select().from(alertChannels).where(and(eq(alertChannels.userId, claimed.userId), eq(alertChannels.isActive, true)));
      for (const event of detected) {
        const [saved] = await tx.insert(events).values({ domainId: claimed.id, ...event }).returning({ id: events.id });
        if (event.severity !== "info" && channels.length) await tx.insert(alertDeliveries).values(channels.map(c => ({ eventId: saved.id, channelId: c.id, userId: claimed.userId, context: { domain: claimed.domain, domainId: claimed.id, score: result.totalScore, previousScore: previous?.score, event } })));
      }
      await tx.update(domains).set({ latestScore: result.totalScore, lastCheckedAt: new Date(result.scannedAt), checkLeaseUntil: null, checkLeaseToken: null }).where(eq(domains.id, claimed.id));
      return { result, checkId: inserted.id, events: detected, previousScore: previous?.score ?? null };
    });
  } finally {
    await db.update(domains).set({ checkLeaseUntil: null, checkLeaseToken: null }).where(and(eq(domains.id, claimed.id), eq(domains.checkLeaseToken, token)));
  }
}
