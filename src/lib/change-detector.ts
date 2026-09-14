import type { MailScoreResult } from "@/lib/dns-check";

export type EventSeverity = "info" | "warning" | "critical";
export interface DetectedEvent { type: string; severity: EventSeverity; title: string; description: string; }
export interface CheckSnapshot {
  score: number; spfStatus: string; dkimStatus: string; dmarcStatus: string; mxStatus: string; rblStatus: string;
  rblListedOn: string[]; spfRecord?: string | null; dmarcPolicy?: string | null;
  dmarcRecord?: string; dkimFingerprint?: string; mxRecords?: string; rblIp?: string | null;
  rblProviders?: { name: string; status: string }[];
}
const normalize = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ") ?? "";
export function snapshotFromResult(r: MailScoreResult): CheckSnapshot {
  return {
    score: r.totalScore, spfStatus: r.spf.status, dkimStatus: r.dkim.status, dmarcStatus: r.dmarc.status, mxStatus: r.mx.status, rblStatus: r.rbl.status,
    spfRecord: normalize(r.spf.record), dmarcPolicy: r.dmarc.policy, dmarcRecord: normalize(r.dmarc.record),
    dkimFingerprint: r.dkim.selectors ? JSON.stringify([...r.dkim.selectors].sort((a,b) => a.selector.localeCompare(b.selector))) : r.dkim.keyFingerprint,
    mxRecords: JSON.stringify(r.mx.records.map(m => `${m.priority} ${m.exchange.toLowerCase().replace(/\.$/, "")}`).sort()),
    rblListedOn: r.rbl.listedOn, rblIp: r.rbl.ip, rblProviders: r.rbl.providers,
  };
}
export function snapshotFromCheckRow(row: { score: number; spfDetails: unknown; dkimDetails: unknown; dmarcDetails: unknown; mxDetails: unknown; rblDetails: unknown }): CheckSnapshot {
  return snapshotFromResult({ totalScore: row.score, spf: row.spfDetails, dkim: row.dkimDetails, dmarc: row.dmarcDetails, mx: row.mxDetails, rbl: row.rblDetails } as MailScoreResult);
}

export function detectDomainChanges(previous: CheckSnapshot, current: CheckSnapshot, domain = "domain"): DetectedEvent[] {
  const out: DetectedEvent[] = [];
  const protocols = ["spf", "dkim", "dmarc", "mx", "rbl"] as const;
  const fullyObserved = protocols.every(p => previous[`${p}Status`] !== "unknown" && current[`${p}Status`] !== "unknown");
  const delta = current.score - previous.score;
  if (fullyObserved && Math.abs(delta) >= 15) out.push({ type: delta < 0 ? "score_drop" : "score_improvement", severity: delta < 0 ? "critical" : "info", title: `DNS health score ${delta < 0 ? "dropped" : "improved"} ${Math.abs(delta)} points`, description: `${domain}: ${previous.score} → ${current.score}/100. This score describes observed DNS configuration, not inbox placement.` });
  for (const [p, field] of [["spf", "spfRecord"], ["dkim", "dkimFingerprint"], ["dmarc", "dmarcRecord"], ["mx", "mxRecords"]] as const) {
    const before = previous[`${p}Status`], after = current[`${p}Status`];
    if (after === "unknown" || before === "unknown") continue;
    const changed = previous[field] !== undefined && current[field] !== undefined && previous[field] !== current[field];
    const policyChanged = p === "dmarc" && previous.dmarcPolicy !== current.dmarcPolicy;
    if (before !== after && after === "pass") {
      out.push({ type: `${p}_recovered`, severity: "info", title: `${p.toUpperCase()} recovered`, description: `${domain}: ${p.toUpperCase()} changed from ${before} to pass. DeliveryWatch confirmed the current DNS observation; this does not measure inbox placement.` });
    } else if (before !== after || changed || policyChanged) {
      out.push({ type: `${p}_changed`, severity: after === "fail" ? "critical" : "warning", title: `${p.toUpperCase()} ${changed || policyChanged ? "record changed" : `status changed: ${before} → ${after}`}`, description: `${domain}: ${p.toUpperCase()} configuration changed. ${p === "spf" ? `Current record: ${current.spfRecord || "missing"}.` : p === "dmarc" ? `Policy: ${previous.dmarcPolicy} → ${current.dmarcPolicy}.` : "Review the latest DNS snapshot."}` });
    }
  }
  // Compare only the same IP and providers with successful observations on both scans.
  if (previous.rblIp !== current.rblIp) {
    if (previous.rblIp && current.rblIp) out.push({ type: "reputation_ip_changed", severity: "info", title: "Reputation check address changed", description: `${previous.rblIp} → ${current.rblIp}. A new address is not evidence of delisting the old address.` });
    if (current.rblListedOn.length) out.push({ type: "blacklist_added", severity: "critical", title: `Listing observed on ${current.rblListedOn.join(", ")}`, description: `${domain}: checked IP ${current.rblIp} is listed. Confirm it belongs to your sending infrastructure.` });
    return out;
  }
  const known = (s: CheckSnapshot, name: string) => s.rblProviders ? s.rblProviders.some(p => p.name === name && p.status !== "unavailable") : s.rblStatus !== "unknown";
  const added = current.rblListedOn.filter(n => !previous.rblListedOn.includes(n));
  const removed = previous.rblListedOn.filter(n => !current.rblListedOn.includes(n) && known(current, n));
  if (added.length) out.push({ type: "blacklist_added", severity: "critical", title: `Listed on ${added.join(", ")}`, description: `${domain}: checked IP ${current.rblIp} is newly listed. Verify it is used for outbound sending before taking action.` });
  if (removed.length) out.push({ type: "blacklist_removed", severity: "info", title: `Delisted from ${removed.join(", ")}`, description: `${domain}: checked IP ${current.rblIp} is no longer listed on these providers.` });
  return out;
}
