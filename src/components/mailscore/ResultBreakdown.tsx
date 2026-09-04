"use client";

import { CheckCard } from "./CheckCard";
import type { MailScoreResult } from "@/lib/dns-check";

export function ResultBreakdown({ result, compact = false }: { result: MailScoreResult; compact?: boolean }) {
  const { spf, dkim, dmarc, mx, rbl } = result;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <CheckCard
        title="SPF"
        subtitle="Sender Policy Framework"
        status={spf.status}
        score={spf.score}
        record={spf.record}
        facts={[
          { label: "Qualifier", value: spf.qualifier ? `${spf.qualifier}all` : "—" },
          { label: "Includes", value: String(spf.includes.length) },
          { label: "Providers", value: spf.detectedProviders.length ? spf.detectedProviders.join(", ") : "—" },
          { label: "Found", value: spf.found ? "Yes" : "No" },
        ]}
        issues={spf.issues}
        suggestions={spf.suggestions}
        compact={compact}
      />
      <CheckCard
        title="DKIM"
        subtitle="DomainKeys Identified Mail"
        status={dkim.status}
        score={dkim.score}
        facts={[
          { label: "Selector", value: dkim.bestSelector ?? "—" },
          { label: "Key size", value: dkim.keyBits ? `${dkim.keyBits}-bit` : "—" },
          { label: "Found", value: dkim.found ? "Yes" : "No" },
        ]}
        issues={dkim.issues}
        suggestions={dkim.suggestions}
        compact={compact}
      />
      <CheckCard
        title="DMARC"
        subtitle="Domain-based Authentication"
        status={dmarc.status}
        score={dmarc.score}
        record={dmarc.record}
        facts={[
          { label: "Policy", value: dmarc.policy ? `p=${dmarc.policy}` : "—" },
          { label: "Found", value: dmarc.found ? "Yes" : "No" },
        ]}
        issues={dmarc.issues}
        suggestions={dmarc.suggestions}
        compact={compact}
      />
      <CheckCard
        title="MX"
        subtitle="Mail Exchange Records"
        status={mx.status}
        score={mx.score}
        record={mx.records.length ? mx.records.map((r) => `${r.priority} ${r.exchange}`).join("\n") : null}
        facts={[
          { label: "Provider", value: mx.primaryProvider ?? "Custom / Unknown" },
          { label: "Records", value: String(mx.records.length) },
          { label: "Backup MX", value: mx.hasBackup ? "Yes" : "No" },
        ]}
        issues={mx.issues}
        suggestions={mx.suggestions}
        compact={compact}
      />
      <CheckCard
        title="RBL"
        subtitle="Blacklist Reputation (8 lists)"
        status={rbl.status}
        score={rbl.score}
        facts={[
          { label: "Tested IP", value: rbl.ip ?? "—" },
          { label: "Listed on", value: rbl.listedOn.length ? rbl.listedOn.join(", ") : "None" },
        ]}
        issues={rbl.issues}
        suggestions={rbl.suggestions}
        compact={compact}
      />
    </div>
  );
}
