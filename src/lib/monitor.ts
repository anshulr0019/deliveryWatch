import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { checks, domains, events } from "@/db/schema";
import { checkDomain, type MailScoreResult } from "@/lib/dns-check";
import { detectDomainChanges, snapshotFromCheckRow, snapshotFromResult, type DetectedEvent } from "@/lib/change-detector";
import { sendAlertsForUser } from "@/lib/alert-sender";

export interface RunCheckOutcome {
  result: MailScoreResult;
  checkId: string;
  events: DetectedEvent[];
  previousScore: number | null;
}

/**
 * Serialize an engine result into a `checks` row.
 */
export function toCheckRow(domainId: string, r: MailScoreResult) {
  return {
    domainId,
    score: r.totalScore,
    spfStatus: r.spf.status,
    spfDetails: r.spf,
    dkimStatus: r.dkim.status,
    dkimDetails: r.dkim,
    dmarcStatus: r.dmarc.status,
    dmarcDetails: r.dmarc,
    mxStatus: r.mx.status,
    mxDetails: r.mx,
    rblStatus: r.rbl.status,
    rblDetails: r.rbl,
    checkedAt: new Date(r.scannedAt),
  };
}

/**
 * Run a full check for a monitored domain: persist snapshot, detect changes,
 * record events, update latest score, and (optionally) dispatch alerts.
 */
export async function runMonitoredCheck(opts: {
  domainId: string;
  domainName: string;
  userId: string;
  sendAlerts?: boolean;
  isInitial?: boolean;
}): Promise<RunCheckOutcome> {
  const { domainId, domainName, userId, sendAlerts = true, isInitial = false } = opts;

  const [previous] = await db.select().from(checks).where(eq(checks.domainId, domainId)).orderBy(desc(checks.checkedAt)).limit(1);

  const result = await checkDomain(domainName);

  const [inserted] = await db.insert(checks).values(toCheckRow(domainId, result)).returning({ id: checks.id });

  let detected: DetectedEvent[] = [];
  if (isInitial || !previous) {
    detected = [
      {
        type: "monitoring_started",
        severity: "info",
        title: "Monitoring started",
        description: `Baseline scan complete — ${domainName} scored ${result.totalScore}/100 (${result.grade}). DeliverWatch will re-check automatically.`,
      },
    ];
    if (result.rbl.listedOn.length > 0) {
      detected.push({
        type: "blacklist_added",
        severity: "critical",
        title: `Blacklisted on ${result.rbl.listedOn.join(", ")}`,
        description: `Initial scan found ${domainName}'s mail IP (${result.rbl.ip}) listed on ${result.rbl.listedOn.length} blacklist(s).`,
      });
    }
  } else {
    detected = detectDomainChanges(snapshotFromCheckRow(previous), snapshotFromResult(result), domainName);
  }

  if (detected.length > 0) {
    await db.insert(events).values(detected.map((e) => ({ domainId, ...e })));
  }

  await db
    .update(domains)
    .set({ latestScore: result.totalScore, lastCheckedAt: new Date(result.scannedAt) })
    .where(eq(domains.id, domainId));

  if (sendAlerts) {
    for (const ev of detected) {
      if (ev.severity === "info") continue;
      try {
        await sendAlertsForUser(userId, {
          domain: domainName,
          domainId,
          score: result.totalScore,
          previousScore: previous?.score,
          event: ev,
        });
      } catch (err) {
        console.error("[monitor] alert dispatch failed", err);
      }
    }
  }

  return { result, checkId: inserted.id, events: detected, previousScore: previous?.score ?? null };
}
