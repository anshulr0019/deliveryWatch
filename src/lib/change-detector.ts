import type { MailScoreResult } from "@/lib/dns-check";

export type EventSeverity = "info" | "warning" | "critical";

export interface DetectedEvent {
  type: string;
  severity: EventSeverity;
  title: string;
  description: string;
}

/** Minimal snapshot shape shared by DB rows (`checks`) and fresh engine results. */
export interface CheckSnapshot {
  score: number;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  mxStatus: string;
  rblStatus: string;
  rblListedOn: string[];
  spfRecord?: string | null;
  dmarcPolicy?: string | null;
}

export function snapshotFromResult(r: MailScoreResult): CheckSnapshot {
  return {
    score: r.totalScore,
    spfStatus: r.spf.status,
    dkimStatus: r.dkim.status,
    dmarcStatus: r.dmarc.status,
    mxStatus: r.mx.status,
    rblStatus: r.rbl.status,
    rblListedOn: r.rbl.listedOn,
    spfRecord: r.spf.record,
    dmarcPolicy: r.dmarc.policy,
  };
}

export function snapshotFromCheckRow(row: {
  score: number;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  mxStatus: string;
  rblStatus: string;
  rblDetails: unknown;
  spfDetails: unknown;
  dmarcDetails: unknown;
}): CheckSnapshot {
  const rbl = (row.rblDetails ?? {}) as { listedOn?: string[] };
  const spf = (row.spfDetails ?? {}) as { record?: string | null };
  const dmarc = (row.dmarcDetails ?? {}) as { policy?: string | null };
  return {
    score: row.score,
    spfStatus: row.spfStatus,
    dkimStatus: row.dkimStatus,
    dmarcStatus: row.dmarcStatus,
    mxStatus: row.mxStatus,
    rblStatus: row.rblStatus,
    rblListedOn: Array.isArray(rbl.listedOn) ? rbl.listedOn : [],
    spfRecord: spf.record ?? null,
    dmarcPolicy: dmarc.policy ?? null,
  };
}

const STATUS_LABEL: Record<string, string> = { pass: "Pass", warn: "Warning", fail: "Fail", unknown: "Unknown" };
const label = (s: string) => STATUS_LABEL[s] ?? s;

/**
 * Compare two consecutive snapshots and return events worth recording / alerting.
 */
export function detectDomainChanges(previous: CheckSnapshot, current: CheckSnapshot, domain = "domain"): DetectedEvent[] {
  const out: DetectedEvent[] = [];
  const delta = current.score - previous.score;

  if (delta <= -15) {
    out.push({
      type: "score_drop",
      severity: "critical",
      title: `Deliverability score dropped ${Math.abs(delta)} points`,
      description: `${domain} fell from ${previous.score} to ${current.score}/100. Review the protocol breakdown for the failing check.`,
    });
  } else if (delta >= 15) {
    out.push({
      type: "score_improvement",
      severity: "info",
      title: `Deliverability score improved ${delta} points`,
      description: `${domain} rose from ${previous.score} to ${current.score}/100.`,
    });
  }

  if (previous.spfStatus !== current.spfStatus) {
    const recordChanged = previous.spfRecord !== undefined && previous.spfRecord !== current.spfRecord;
    out.push({
      type: "spf_changed",
      severity: "warning",
      title: `SPF status changed: ${label(previous.spfStatus)} → ${label(current.spfStatus)}`,
      description: recordChanged
        ? `The SPF record for ${domain} was modified. Current record: ${current.spfRecord ?? "none"}.`
        : `SPF evaluation for ${domain} changed from ${label(previous.spfStatus)} to ${label(current.spfStatus)}.`,
    });
  }

  if (previous.dkimStatus !== current.dkimStatus) {
    out.push({
      type: "dkim_changed",
      severity: "warning",
      title: `DKIM status changed: ${label(previous.dkimStatus)} → ${label(current.dkimStatus)}`,
      description: `DKIM signing configuration for ${domain} has changed. Verify your selector keys are published and not revoked.`,
    });
  }

  if (previous.dmarcStatus !== current.dmarcStatus) {
    out.push({
      type: "dmarc_changed",
      severity: "warning",
      title: `DMARC status changed: ${label(previous.dmarcStatus)} → ${label(current.dmarcStatus)}`,
      description: `DMARC policy for ${domain} is now p=${current.dmarcPolicy ?? "none/missing"} (was p=${previous.dmarcPolicy ?? "none/missing"}).`,
    });
  }

  if (previous.mxStatus !== current.mxStatus) {
    out.push({
      type: "mx_changed",
      severity: current.mxStatus === "fail" ? "critical" : "warning",
      title: `MX status changed: ${label(previous.mxStatus)} → ${label(current.mxStatus)}`,
      description: `Inbound mail routing for ${domain} changed. Confirm MX hosts resolve and are reachable.`,
    });
  }

  const prevListed = new Set(previous.rblListedOn);
  const currListed = new Set(current.rblListedOn);
  const added = [...currListed].filter((x) => !prevListed.has(x));
  const removed = [...prevListed].filter((x) => !currListed.has(x));

  if (added.length > 0) {
    out.push({
      type: "blacklist_added",
      severity: "critical",
      title: `Blacklisted on ${added.join(", ")}`,
      description: `${domain}'s mail IP was newly listed on ${added.length} blacklist${added.length > 1 ? "s" : ""}. Inbox placement is severely impacted — investigate and request delisting.`,
    });
  }

  if (removed.length > 0) {
    out.push({
      type: "blacklist_removed",
      severity: "info",
      title: `Delisted from ${removed.join(", ")}`,
      description: `${domain}'s mail IP is no longer listed on ${removed.join(", ")}.`,
    });
  }

  return out;
}
