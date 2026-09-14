import type { CheckStatus, MailScoreResult } from "@/lib/dns-check";

export type CopilotProtocol = "spf" | "dkim" | "dmarc" | "mx" | "rbl";
export type CopilotSeverity = "success" | "info" | "warning" | "critical";
export type CopilotChange =
  | "not_compared"
  | "unchanged"
  | "changed"
  | "worsened"
  | "improved"
  | "resolved"
  | "unavailable";

export const COPILOT_FINDING_KEY_BY_PROTOCOL = {
  spf: "spf",
  dkim: "dkim",
  dmarc: "dmarc",
  mx: "mx",
  rbl: "rbl",
} as const satisfies Record<CopilotProtocol, string>;

export type CopilotFindingKey = (typeof COPILOT_FINDING_KEY_BY_PROTOCOL)[CopilotProtocol];

export interface CopilotSetupProfile {
  dnsProvider: string | null;
  emailProviders: string[];
  emailServices: string[];
  sendingPurposes: string[];
  sendingPurpose: string;
  dkimSelectors: string[];
  sendingIps: string[];
  notes: string | null;
}

export interface CopilotReference {
  id: string;
  provider: string;
  title: string;
  label?: string;
  url: string;
  href?: string;
  topics: CopilotProtocol[];
  kind: "dns-provider" | "email-provider" | "standard" | "reputation-provider";
}

export interface CopilotEvidence {
  label: string;
  value: string;
  url: string | null;
}

export interface CopilotFinding {
  id: CopilotFindingKey;
  key: CopilotFindingKey;
  protocol: CopilotProtocol;
  label: string;
  status: CheckStatus;
  severity: CopilotSeverity;
  title: string;
  summary: string;
  explanation: string;
  evidence: CopilotEvidence[];
  impact: string;
  change: CopilotChange;
  changed: string;
  whatChanged: string;
  changeSummary: string;
  nextStep: string;
  steps: string[];
  references: CopilotReference[];
  sources: CopilotReference[];
}

export interface CopilotScoreSummary {
  current: number;
  previous: number | null;
  delta: number | null;
  direction: "up" | "down" | "unchanged" | "not_compared";
  complete: boolean;
}

export interface CopilotReportSummary {
  headline: string;
  detail: string;
  healthyCount: number;
  attentionCount: number;
  unknownCount: number;
}

export interface CopilotReport {
  version: 1;
  domain: string;
  generatedAt: string;
  setup: CopilotSetupProfile;
  score: CopilotScoreSummary;
  summary: string;
  summaryStats: CopilotReportSummary;
  scopeNotice: string;
  whatChanged: string[];
  changes: string[];
  findings: CopilotFinding[];
  references: CopilotReference[];
}

const PROTOCOLS: CopilotProtocol[] = ["spf", "dkim", "dmarc", "mx", "rbl"];

const DNS_PROVIDER_ALIASES: Record<string, string> = {
  aws: "Route 53",
  "amazon route 53": "Route 53",
  route53: "Route 53",
  "route 53": "Route 53",
  cloudflare: "Cloudflare",
  digitalocean: "DigitalOcean",
  "digital ocean": "DigitalOcean",
  godaddy: "GoDaddy",
  "google cloud": "Google Cloud DNS",
  "google cloud dns": "Google Cloud DNS",
  namecheap: "Namecheap",
  porkbun: "Porkbun",
  squarespace: "Squarespace",
  "google domains": "Squarespace",
  vercel: "Vercel DNS",
  "vercel dns": "Vercel DNS",
};

const EMAIL_PROVIDER_ALIASES: Record<string, string> = {
  aws: "Amazon SES",
  "amazon ses": "Amazon SES",
  ses: "Amazon SES",
  brevo: "Brevo",
  sendinblue: "Brevo",
  gmail: "Google Workspace",
  google: "Google Workspace",
  "google workspace": "Google Workspace",
  mailgun: "Mailgun",
  microsoft: "Microsoft 365",
  "microsoft 365": "Microsoft 365",
  office365: "Microsoft 365",
  "office 365": "Microsoft 365",
  outlook: "Microsoft 365",
  postmark: "Postmark",
  resend: "Resend",
  sendgrid: "SendGrid",
  "twilio sendgrid": "SendGrid",
  zoho: "Zoho Mail",
  "zoho mail": "Zoho Mail",
};

/** Reviewed, first-party documentation used by deterministic Copilot reports. */
export const COPILOT_PROVIDER_GUIDANCE: CopilotReference[] = [
  {
    id: "cloudflare-dns-records",
    provider: "Cloudflare",
    title: "Create and edit DNS records in Cloudflare",
    url: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "godaddy-dns-records",
    provider: "GoDaddy",
    title: "Manage DNS records in GoDaddy",
    url: "https://www.godaddy.com/help/manage-dns-records-680",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "namecheap-dns-records",
    provider: "Namecheap",
    title: "Manage DNS records in Namecheap",
    url: "https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "route53-dns-records",
    provider: "Route 53",
    title: "Create records with Amazon Route 53",
    url: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "google-cloud-dns-records",
    provider: "Google Cloud DNS",
    title: "Manage records in Google Cloud DNS",
    url: "https://cloud.google.com/dns/docs/records",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "vercel-dns-records",
    provider: "Vercel DNS",
    title: "Manage DNS records in Vercel",
    url: "https://vercel.com/docs/domains/managing-dns-records",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "squarespace-dns-records",
    provider: "Squarespace",
    title: "Add custom DNS records in Squarespace",
    url: "https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-custom-DNS-records-to-your-Squarespace-managed-domain",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "digitalocean-dns-records",
    provider: "DigitalOcean",
    title: "Manage DNS records in DigitalOcean",
    url: "https://docs.digitalocean.com/products/networking/dns/how-to/manage-records/",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "porkbun-dns-records",
    provider: "Porkbun",
    title: "Edit DNS records in Porkbun",
    url: "https://kb.porkbun.com/article/68-how-to-edit-dns-records",
    topics: ["spf", "dkim", "dmarc", "mx"],
    kind: "dns-provider",
  },
  {
    id: "google-spf",
    provider: "Google Workspace",
    title: "Set up SPF for Google Workspace",
    url: "https://support.google.com/a/answer/33786",
    topics: ["spf"],
    kind: "email-provider",
  },
  {
    id: "google-dkim",
    provider: "Google Workspace",
    title: "Set up DKIM for Google Workspace",
    url: "https://support.google.com/a/answer/174124",
    topics: ["dkim"],
    kind: "email-provider",
  },
  {
    id: "google-dmarc",
    provider: "Google Workspace",
    title: "Set up DMARC for Google Workspace",
    url: "https://support.google.com/a/answer/2466580",
    topics: ["dmarc"],
    kind: "email-provider",
  },
  {
    id: "google-mx",
    provider: "Google Workspace",
    title: "Set up MX records for Google Workspace",
    url: "https://support.google.com/a/answer/87127",
    topics: ["mx"],
    kind: "email-provider",
  },
  {
    id: "microsoft-spf",
    provider: "Microsoft 365",
    title: "Configure SPF for Microsoft 365",
    url: "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-spf-configure",
    topics: ["spf"],
    kind: "email-provider",
  },
  {
    id: "microsoft-dkim",
    provider: "Microsoft 365",
    title: "Configure DKIM for Microsoft 365",
    url: "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure",
    topics: ["dkim"],
    kind: "email-provider",
  },
  {
    id: "microsoft-dmarc",
    provider: "Microsoft 365",
    title: "Configure DMARC for Microsoft 365",
    url: "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dmarc-configure",
    topics: ["dmarc"],
    kind: "email-provider",
  },
  {
    id: "microsoft-domain-dns",
    provider: "Microsoft 365",
    title: "Add a domain and DNS records to Microsoft 365",
    url: "https://learn.microsoft.com/en-us/microsoft-365/admin/setup/add-domain",
    topics: ["mx"],
    kind: "email-provider",
  },
  {
    id: "resend-domains",
    provider: "Resend",
    title: "Manage and verify a sending domain in Resend",
    url: "https://resend.com/docs/dashboard/domains/introduction",
    topics: ["spf", "dkim", "dmarc"],
    kind: "email-provider",
  },
  {
    id: "ses-spf",
    provider: "Amazon SES",
    title: "Configure a custom MAIL FROM domain in Amazon SES",
    url: "https://docs.aws.amazon.com/ses/latest/dg/mail-from.html",
    topics: ["spf"],
    kind: "email-provider",
  },
  {
    id: "ses-dkim",
    provider: "Amazon SES",
    title: "Configure DKIM in Amazon SES",
    url: "https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html",
    topics: ["dkim"],
    kind: "email-provider",
  },
  {
    id: "sendgrid-domain-authentication",
    provider: "SendGrid",
    title: "Set up domain authentication in SendGrid",
    url: "https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication",
    topics: ["spf", "dkim"],
    kind: "email-provider",
  },
  {
    id: "mailgun-domain-verification",
    provider: "Mailgun",
    title: "Verify a sending domain in Mailgun",
    url: "https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-verify",
    topics: ["spf", "dkim"],
    kind: "email-provider",
  },
  {
    id: "postmark-dkim",
    provider: "Postmark",
    title: "Set up DKIM in Postmark",
    url: "https://postmarkapp.com/support/article/1092-how-do-i-set-up-dkim-for-postmark",
    topics: ["dkim"],
    kind: "email-provider",
  },
  {
    id: "zoho-dkim",
    provider: "Zoho Mail",
    title: "Configure DKIM in Zoho Mail",
    url: "https://www.zoho.com/mail/help/adminconsole/dkim-configuration.html",
    topics: ["dkim"],
    kind: "email-provider",
  },
  {
    id: "brevo-domain-authentication",
    provider: "Brevo",
    title: "Authenticate a sending domain in Brevo",
    url: "https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-record-DMARC-record",
    topics: ["dkim", "dmarc"],
    kind: "email-provider",
  },
  {
    id: "rfc-spf",
    provider: "RFC Editor",
    title: "SPF specification (RFC 7208)",
    url: "https://www.rfc-editor.org/rfc/rfc7208",
    topics: ["spf"],
    kind: "standard",
  },
  {
    id: "rfc-dkim",
    provider: "RFC Editor",
    title: "DKIM specification (RFC 6376)",
    url: "https://www.rfc-editor.org/rfc/rfc6376",
    topics: ["dkim"],
    kind: "standard",
  },
  {
    id: "rfc-dmarc",
    provider: "RFC Editor",
    title: "DMARC specification (RFC 7489)",
    url: "https://www.rfc-editor.org/rfc/rfc7489",
    topics: ["dmarc"],
    kind: "standard",
  },
  {
    id: "rfc-smtp",
    provider: "RFC Editor",
    title: "SMTP specification and MX routing (RFC 5321)",
    url: "https://www.rfc-editor.org/rfc/rfc5321",
    topics: ["mx"],
    kind: "standard",
  },
  {
    id: "spamhaus-lookup",
    provider: "Spamhaus ZEN",
    title: "Check an IP with Spamhaus",
    url: "https://check.spamhaus.org/",
    topics: ["rbl"],
    kind: "reputation-provider",
  },
  {
    id: "barracuda-lookup",
    provider: "Barracuda",
    title: "Barracuda reputation lookup",
    url: "https://www.barracudacentral.org/lookups",
    topics: ["rbl"],
    kind: "reputation-provider",
  },
  {
    id: "spamcop-blocklist",
    provider: "SpamCop",
    title: "SpamCop blocking list information",
    url: "https://www.spamcop.net/bl.shtml",
    topics: ["rbl"],
    kind: "reputation-provider",
  },
  {
    id: "uceprotect-lookup",
    provider: "UCEPROTECT L1",
    title: "UCEPROTECT blocklist lookup",
    url: "https://www.uceprotect.net/en/rblcheck.php",
    topics: ["rbl"],
    kind: "reputation-provider",
  },
  {
    id: "psbl-lookup",
    provider: "PSBL",
    title: "PSBL lookup and removal information",
    url: "https://psbl.org/",
    topics: ["rbl"],
    kind: "reputation-provider",
  },
  {
    id: "dronebl-lookup",
    provider: "DroneBL",
    title: "DroneBL lookup",
    url: "https://dronebl.org/lookup",
    topics: ["rbl"],
    kind: "reputation-provider",
  },
  {
    id: "cbl-lookup",
    provider: "CBL Abuseat",
    title: "CBL lookup",
    url: "https://www.abuseat.org/lookup.cgi",
    topics: ["rbl"],
    kind: "reputation-provider",
  },
];

function asRecord(input: unknown): Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function cleanString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return cleaned || null;
}

function stringList(value: unknown, maxItems: number, maxLength = 120): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const output: string[] = [];
  const seen = new Set<string>();
  for (const item of values) {
    const cleaned = cleanString(item, maxLength);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
    if (output.length === maxItems) break;
  }
  return output;
}

function firstPresent(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key];
  return undefined;
}

function canonicalProvider(value: string | null, aliases: Record<string, string>): string | null {
  if (!value) return null;
  return aliases[value.toLowerCase()] ?? value;
}

function canonicalProviderList(values: string[], aliases: Record<string, string>): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const provider = canonicalProvider(value, aliases);
    if (!provider || seen.has(provider.toLowerCase())) continue;
    seen.add(provider.toLowerCase());
    output.push(provider);
  }
  return output;
}

function validSelector(value: string): boolean {
  return value.length <= 120 && /^[a-zA-Z0-9_-]{1,63}(?:\.[a-zA-Z0-9_-]{1,63})*$/.test(value);
}

function validIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

/** Normalizes untrusted JSON from a persisted setup profile into a stable, serializable shape. */
export function normalizeSetupProfile(input: unknown): CopilotSetupProfile {
  const record = asRecord(input);
  const dnsProvider = canonicalProvider(
    cleanString(firstPresent(record, ["dnsProvider", "dns_provider"]), 80),
    DNS_PROVIDER_ALIASES,
  );
  const emailProviders = canonicalProviderList(
    stringList(
      firstPresent(record, ["emailProviders", "emailProvider", "email_services", "emailServices"]),
      12,
      80,
    ),
    EMAIL_PROVIDER_ALIASES,
  );
  const sendingPurposes = stringList(
    firstPresent(record, ["sendingPurposes", "sendingPurpose", "sending_purposes", "useCases"]),
    12,
    120,
  );
  const dkimSelectors = stringList(
    firstPresent(record, ["dkimSelectors", "dkimSelector", "dkim_selectors"]),
    10,
    120,
  ).filter(validSelector);
  const sendingIps = stringList(
    firstPresent(record, ["sendingIps", "sendingIp", "sending_ips"]),
    20,
    15,
  ).filter(validIpv4);
  const notes = cleanString(firstPresent(record, ["notes", "setupNotes", "setup_notes"]), 2000);

  return {
    dnsProvider,
    emailProviders,
    emailServices: [...emailProviders],
    sendingPurposes,
    sendingPurpose: sendingPurposes.join(", "),
    dkimSelectors,
    sendingIps,
    notes,
  };
}

function protocolLabel(protocol: CopilotProtocol): string {
  return protocol === "rbl" ? "IP reputation" : protocol.toUpperCase();
}

function resultFor(result: MailScoreResult, protocol: CopilotProtocol) {
  return result[protocol];
}

function severityFor(status: CheckStatus): CopilotSeverity {
  if (status === "pass") return "success";
  if (status === "fail") return "critical";
  if (status === "warn") return "warning";
  return "info";
}

function providerPhrase(profile: CopilotSetupProfile): string {
  return profile.emailProviders.length ? profile.emailProviders.join(" and ") : "each service that sends mail for this domain";
}

function dnsPhrase(profile: CopilotSetupProfile): string {
  return profile.dnsProvider ? `${profile.dnsProvider} DNS` : "the domain's authoritative DNS provider";
}

function safeIssues(issues: string[]): string {
  return issues.length ? issues.join(" ") : "The scan did not record an additional issue description.";
}

function recordSignature(result: MailScoreResult, protocol: CopilotProtocol): string {
  if (protocol === "spf") {
    return JSON.stringify({ record: result.spf.record, qualifier: result.spf.qualifier, includes: [...result.spf.includes].sort() });
  }
  if (protocol === "dkim") {
    return JSON.stringify({
      bestSelector: result.dkim.bestSelector,
      keyFingerprint: result.dkim.keyFingerprint ?? null,
      selectors: [...(result.dkim.selectors ?? [])].sort((a, b) => a.selector.localeCompare(b.selector)),
    });
  }
  if (protocol === "dmarc") return JSON.stringify({ record: result.dmarc.record, policy: result.dmarc.policy });
  if (protocol === "mx") {
    return JSON.stringify(
      [...result.mx.records]
        .map((record) => ({ priority: record.priority, exchange: record.exchange.toLowerCase().replace(/\.$/, "") }))
        .sort((a, b) => a.priority - b.priority || a.exchange.localeCompare(b.exchange)),
    );
  }
  return JSON.stringify({
    ip: result.rbl.ip,
    source: result.rbl.source ?? null,
    listedOn: [...result.rbl.listedOn].sort(),
    providers: [...(result.rbl.providers ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
  });
}

function changedEvidenceSummary(
  protocol: CopilotProtocol,
  current: MailScoreResult,
  previous: MailScoreResult,
): string {
  if (protocol === "spf") {
    if (current.spf.record !== previous.spf.record) return "The observed SPF record changed.";
    return "The resolved SPF evidence changed.";
  }
  if (protocol === "dkim") {
    const before = previous.dkim.bestSelector ?? "none discovered";
    const now = current.dkim.bestSelector ?? "none discovered";
    return `The best discovered DKIM selector changed from ${before} to ${now}.`;
  }
  if (protocol === "dmarc") {
    if (current.dmarc.policy !== previous.dmarc.policy) {
      return `The observed DMARC policy changed from ${previous.dmarc.policy ? `p=${previous.dmarc.policy}` : "not available"} to ${current.dmarc.policy ? `p=${current.dmarc.policy}` : "not available"}.`;
    }
    return "The observed DMARC record changed while the parsed policy stayed the same.";
  }
  if (protocol === "mx") return "The observed MX routes or priorities changed.";

  if (current.rbl.ip !== previous.rbl.ip) {
    return `The checked reputation address changed from ${previous.rbl.ip ?? "not available"} to ${current.rbl.ip ?? "not available"}; this does not establish that the earlier address was delisted.`;
  }
  const added = current.rbl.listedOn.filter((provider) => !previous.rbl.listedOn.includes(provider));
  const removed = previous.rbl.listedOn.filter(
    (provider) => current.rbl.providers?.some((observation) => observation.name === provider && observation.status === "clear"),
  );
  const changes = [
    added.length ? `Newly observed: ${added.join(", ")}.` : "",
    removed.length ? `No longer observed in completed queries: ${removed.join(", ")}.` : "",
  ].filter(Boolean);
  return changes.join(" ") || "Reputation-provider response evidence changed.";
}

function compareFinding(
  protocol: CopilotProtocol,
  current: MailScoreResult,
  previous: MailScoreResult | null,
): { change: CopilotChange; summary: string } {
  if (!previous || previous.domain.toLowerCase() !== current.domain.toLowerCase()) {
    return { change: "not_compared", summary: "No previous scan for this domain was supplied for comparison." };
  }
  const now = resultFor(current, protocol);
  const before = resultFor(previous, protocol);
  const period = `Previous scan: ${previous.scannedAt}. Current scan: ${current.scannedAt}.`;

  if (now.status === "unknown" || before.status === "unknown") {
    if (now.status === "unknown" && before.status !== "unknown") {
      return {
        change: "unavailable",
        summary: `${protocolLabel(protocol)} was ${before.status} previously, but the current observation is unknown. This does not confirm a regression. ${period}`,
      };
    }
    if (now.status !== "unknown" && before.status === "unknown") {
      return {
        change: "unavailable",
        summary: `${protocolLabel(protocol)} is ${now.status} now; the previous unknown observation cannot establish when this state began. ${period}`,
      };
    }
    return { change: "unavailable", summary: `Both observations are unknown, so no change can be established. ${period}` };
  }

  const statusRank: Record<Exclude<CheckStatus, "unknown">, number> = { fail: 0, warn: 1, pass: 2 };
  if (now.status !== before.status) {
    if (now.status === "pass" && before.status !== "pass") {
      return { change: "resolved", summary: `${protocolLabel(protocol)} changed from ${before.status} to pass. ${period}` };
    }
    if (statusRank[now.status] > statusRank[before.status]) {
      return { change: "improved", summary: `${protocolLabel(protocol)} improved from ${before.status} to ${now.status}. ${period}` };
    }
    return { change: "worsened", summary: `${protocolLabel(protocol)} worsened from ${before.status} to ${now.status}. ${period}` };
  }

  if (recordSignature(current, protocol) !== recordSignature(previous, protocol)) {
    return {
      change: "changed",
      summary: `${changedEvidenceSummary(protocol, current, previous)} Status remained ${now.status}. Review both snapshots before changing DNS. ${period}`,
    };
  }
  if (now.score !== before.score) {
    const change = now.score > before.score ? "improved" : "worsened";
    return {
      change,
      summary: `${protocolLabel(protocol)} stayed ${now.status}, but its score changed from ${before.score} to ${now.score}. ${period}`,
    };
  }
  return { change: "unchanged", summary: `${protocolLabel(protocol)} evidence and status are unchanged since ${previous.scannedAt}.` };
}

function referencesFor(
  protocol: CopilotProtocol,
  profile: CopilotSetupProfile,
  current: MailScoreResult,
): CopilotReference[] {
  const configuredProviders = new Set(profile.emailProviders);
  if (protocol === "spf") current.spf.detectedProviders.forEach((provider) => configuredProviders.add(provider));
  if (protocol === "mx" && current.mx.primaryProvider) configuredProviders.add(current.mx.primaryProvider);
  const rblProviders = new Set(
    protocol === "rbl"
      ? [...current.rbl.listedOn, ...(current.rbl.providers ?? []).filter((item) => item.status === "unavailable").map((item) => item.name)]
      : [],
  );

  return COPILOT_PROVIDER_GUIDANCE.filter((reference) => {
    if (!reference.topics.includes(protocol)) return false;
    if (reference.kind === "standard") return true;
    if (reference.kind === "dns-provider") return reference.provider === profile.dnsProvider;
    if (reference.kind === "email-provider") return configuredProviders.has(reference.provider);
    return rblProviders.has(reference.provider);
  }).map((reference) => ({ ...reference, label: reference.title, href: reference.url }));
}

function evidenceItem(label: string, value: string): CopilotEvidence {
  return { label, value, url: null };
}

function baseEvidence(
  current: MailScoreResult,
  protocol: CopilotProtocol,
  previous: MailScoreResult | null,
): CopilotEvidence[] {
  const result = resultFor(current, protocol);
  const evidence = [
    evidenceItem("Observed status", result.status),
    evidenceItem("Configuration score", `${result.score}/${result.maxScore}`),
    evidenceItem("Observed at", current.scannedAt),
  ];
  if (previous && previous.domain.toLowerCase() === current.domain.toLowerCase()) {
    const before = resultFor(previous, protocol);
    evidence.push(evidenceItem("Previous observation", `${before.status}, ${before.score}/${before.maxScore} at ${previous.scannedAt}`));
  }
  return evidence;
}

function titleFor(protocol: CopilotProtocol, current: MailScoreResult): string {
  const result = resultFor(current, protocol);
  if (result.status === "unknown") return `${protocolLabel(protocol)} could not be fully determined`;
  if (protocol === "dmarc" && current.dmarc.policy === "none") return "DMARC is published in monitoring mode";
  if (protocol === "rbl" && current.rbl.listedOn.length) return "A listing was observed for the checked IP";
  if (result.status === "pass") return `${protocolLabel(protocol)} check passed`;
  if (result.status === "warn") return `${protocolLabel(protocol)} needs review`;
  return `${protocolLabel(protocol)} check failed`;
}

function explanationFor(protocol: CopilotProtocol, current: MailScoreResult): string {
  const result = resultFor(current, protocol);
  if (result.status === "unknown") {
    return `DeliveryWatch could not make a complete ${protocolLabel(protocol)} observation. ${safeIssues(result.issues)} Unknown means the evidence is incomplete; it is not a failed DNS configuration.`;
  }
  if (protocol === "dmarc" && current.dmarc.policy === "none") {
    return `A DMARC record was found with p=none. That is a valid monitoring policy, not a missing or invalid DMARC record. ${safeIssues(current.dmarc.issues)}`;
  }
  return safeIssues(result.issues);
}

function evidenceFor(
  protocol: CopilotProtocol,
  current: MailScoreResult,
  previous: MailScoreResult | null,
): CopilotEvidence[] {
  const evidence = baseEvidence(current, protocol, previous);
  if (protocol === "spf") {
    evidence.push(evidenceItem("SPF record observed", current.spf.found ? "Yes" : "No"));
    if (current.spf.record) evidence.push(evidenceItem("Observed record", current.spf.record));
    if (current.spf.qualifier) evidence.push(evidenceItem("Resolved terminal qualifier", `${current.spf.qualifier}all`));
    if (current.spf.detectedProviders.length) evidence.push(evidenceItem("Providers inferred from public SPF evidence", current.spf.detectedProviders.join(", ")));
  } else if (protocol === "dkim") {
    evidence.push(evidenceItem("DKIM key discovered", current.dkim.found ? "Yes" : "No"));
    if (current.dkim.bestSelector) evidence.push(evidenceItem("Best discovered selector", current.dkim.bestSelector));
    if (current.dkim.keyBits) evidence.push(evidenceItem("Discovered public-key strength", `${current.dkim.keyBits} bits`));
    if (current.dkim.selectors?.length) evidence.push(evidenceItem("Selectors with public DNS evidence", current.dkim.selectors.map((item) => item.selector).join(", ")));
  } else if (protocol === "dmarc") {
    evidence.push(evidenceItem("DMARC record observed", current.dmarc.found ? "Yes" : "No"));
    if (current.dmarc.policy) evidence.push(evidenceItem("Published policy", `p=${current.dmarc.policy}`));
    if (current.dmarc.record) evidence.push(evidenceItem("Observed record", current.dmarc.record));
  } else if (protocol === "mx") {
    evidence.push(evidenceItem("MX record observed", current.mx.found ? "Yes" : "No"));
    if (current.mx.records.length) {
      evidence.push(evidenceItem("Observed routes", current.mx.records.map((item) => `${item.priority} ${item.exchange}`).join(", ")));
    }
    if (current.mx.primaryProvider) evidence.push(evidenceItem("Provider inferred from primary MX hostname", current.mx.primaryProvider));
  } else {
    evidence.push(evidenceItem("Checked IPv4 address", current.rbl.ip ?? "Not available"));
    evidence.push(evidenceItem("Address source", current.rbl.source === "configured" ? "User-configured sending IP" : "Inbound MX host inference"));
    evidence.push(evidenceItem("Listings observed", current.rbl.listedOn.length ? current.rbl.listedOn.join(", ") : "None in completed queries"));
    if (current.rbl.providers?.length) {
      const answered = current.rbl.providers.filter((item) => item.status !== "unavailable").length;
      evidence.push(evidenceItem("Reputation query coverage", `${answered}/${current.rbl.providers.length} providers answered`));
    }
  }
  return evidence;
}

function impactFor(protocol: CopilotProtocol, current: MailScoreResult): string {
  const status = resultFor(current, protocol).status;
  if (status === "unknown") return "Impact cannot be inferred from an incomplete observation. Retry the check before changing DNS.";
  if (protocol === "spf") {
    return "SPF affects authentication for a message's envelope-sender domain. This DNS-only check did not send a message or inspect its headers, so it cannot confirm actual SPF outcomes or inbox placement.";
  }
  if (protocol === "dkim") {
    return "DKIM DNS evidence supports signature verification, but DNS presence alone does not prove that outgoing messages are being signed or aligned with the From domain.";
  }
  if (protocol === "dmarc") {
    return current.dmarc.policy === "none"
      ? "p=none requests reporting without quarantine or rejection. Receiving systems still apply their own filtering, and this scan does not measure delivery outcomes."
      : "DMARC tells receivers how to handle authentication and alignment results. This scan did not test a real message, receiver behavior, or inbox placement.";
  }
  if (protocol === "mx") {
    return "MX records control inbound mail routing. They do not identify every outbound sender and do not measure whether outgoing messages reach an inbox.";
  }
  if (current.rbl.source !== "configured") {
    return "The checked address was inferred from an inbound MX host. A listing matters to outbound mail only if that address actually sends it; confirm the sending IP before acting.";
  }
  return "A blocklist observation can affect mail from the checked sending IP, but receiver decisions vary. It is not an inbox-placement test.";
}

function passiveSteps(protocol: CopilotProtocol): string[] {
  if (protocol === "rbl") {
    return [
      "No delisting action is recommended from this result.",
      "Keep the configured sending IP current and continue monitoring completed reputation queries.",
    ];
  }
  return [
    "No DNS change is recommended from this result.",
    "Keep the saved provider profile current and verify authentication with real message headers after sender changes.",
  ];
}

function unknownSteps(protocol: CopilotProtocol, profile: CopilotSetupProfile): string[] {
  const steps = ["Run the check again before changing any DNS record; an unavailable lookup is not evidence that a record is missing."];
  if (protocol === "dkim") {
    if (profile.dkimSelectors.length) {
      steps.push(`Confirm that the saved selectors (${profile.dkimSelectors.join(", ")}) still match the selectors issued by ${providerPhrase(profile)}.`);
    } else {
      steps.push(`Retrieve the active selector from ${providerPhrase(profile)}, save that selector in DeliveryWatch, and run an explicit lookup.`);
    }
    steps.push("Inspect a recent message header to confirm which selector and signing domain are actually in use.");
  } else if (protocol === "rbl") {
    steps.push("Confirm the outbound sending IPv4 address with the email provider; do not treat an inferred inbound MX address as the sender.");
    steps.push("Retry unavailable reputation providers individually before concluding that the address is clear or listed.");
  } else {
    steps.push(`Check the same record in ${dnsPhrase(profile)} and confirm the authoritative nameservers are responding.`);
    steps.push("After DNS is observable again, rerun DeliveryWatch and compare the new evidence with the saved scan.");
  }
  return steps;
}

function fixSteps(protocol: CopilotProtocol, current: MailScoreResult, profile: CopilotSetupProfile): string[] {
  const result = resultFor(current, protocol);
  if (result.status === "pass") return passiveSteps(protocol);
  if (result.status === "unknown") return unknownSteps(protocol, profile);

  if (protocol === "spf") {
    return [
      `Confirm every legitimate sender for this domain${profile.sendingPurposes.length ? ` and its saved uses (${profile.sendingPurposes.join(", ")})` : ""}. The current profile names ${providerPhrase(profile)}.`,
      `Open each sending provider's official domain-authentication instructions and obtain its current SPF requirements. DeliveryWatch will not invent include domains or IP addresses.`,
      `In ${dnsPhrase(profile)}, update the single SPF TXT record for the relevant sending domain. Preserve confirmed legitimate senders, remove only retired senders, and do not publish a second SPF record.`,
      "Wait for DNS propagation, rerun the SPF check, then inspect a real message header to verify the intended envelope sender passes SPF.",
    ];
  }
  if (protocol === "dkim") {
    return [
      `Open ${providerPhrase(profile)} and retrieve or generate the exact DKIM selector, record name, and public value issued for this domain. DeliveryWatch will not generate a DKIM key.`,
      profile.dkimSelectors.length
        ? `Compare the provider's active selectors with the saved selectors: ${profile.dkimSelectors.join(", ")}.`
        : "Save the provider-issued selector in DeliveryWatch so the next scan checks the exact DNS name instead of relying only on common-selector discovery.",
      `Publish the provider-issued record unchanged in ${dnsPhrase(profile)}. Check whether that DNS interface automatically appends the domain to the host name.`,
      "Enable signing in the email provider if it requires a separate step, rerun DeliveryWatch, and verify a recent message header contains a passing DKIM result for the expected domain.",
    ];
  }
  if (protocol === "dmarc") {
    return [
      `Confirm SPF and DKIM for every legitimate sender in ${providerPhrase(profile)} before tightening DMARC.`,
      "Choose a real, monitored mailbox or reporting service for aggregate reports; do not publish an example address that has not been created.",
      `In ${dnsPhrase(profile)}, keep exactly one TXT record at the DMARC host and follow the provider guidance for a staged policy. p=none is a valid monitoring stage.`,
      "Review aggregate reports for aligned legitimate traffic before moving gradually to quarantine or reject, then rerun DeliveryWatch.",
    ];
  }
  if (protocol === "mx") {
    return [
      `Confirm which service should receive inbound mail. The saved email setup names ${providerPhrase(profile)}.`,
      "Copy the exact MX hostnames and priorities from that provider's admin documentation; do not infer outbound infrastructure from MX records.",
      `In ${dnsPhrase(profile)}, compare the current MX set with the provider-issued values and change only entries that are confirmed incorrect.`,
      "Wait for DNS propagation, rerun the MX check, and send a controlled inbound test message to verify delivery.",
    ];
  }

  const listed = current.rbl.listedOn.length ? current.rbl.listedOn.join(", ") : "the reporting provider";
  return [
    `Confirm that ${current.rbl.ip ?? "the checked address"} is an active outbound sending IP. Its scan source is ${current.rbl.source === "configured" ? "the saved setup" : "an inbound MX inference"}.`,
    `Use the official lookup for ${listed} to confirm the listing and read the evidence supplied by that provider.`,
    "Investigate the sending system, account compromise, list quality, complaints, or configuration that caused the listing before requesting removal.",
    "Follow only the blocklist operator's official removal process, then verify again. A clear lookup does not by itself prove inbox placement.",
  ];
}

function nextStepFor(protocol: CopilotProtocol, current: MailScoreResult, profile: CopilotSetupProfile): string {
  const result = resultFor(current, protocol);
  if (result.status === "pass") return "No configuration change is indicated; keep monitoring this evidence.";
  if (result.status === "unknown") return "Retry the observation before changing DNS.";
  if (protocol === "spf") return `Inventory every legitimate sender in ${providerPhrase(profile)} before editing the existing SPF record.`;
  if (protocol === "dkim") return `Retrieve the exact active selector and record from ${providerPhrase(profile)}.`;
  if (protocol === "dmarc") return "Confirm aligned legitimate senders and a valid reporting destination before changing the DMARC policy.";
  if (protocol === "mx") return `Compare the observed MX routes with the exact inbound records from ${providerPhrase(profile)}.`;
  return "Confirm that the checked IP sends outbound mail, then verify the listing with the blocklist operator.";
}

function buildFinding(
  protocol: CopilotProtocol,
  current: MailScoreResult,
  profile: CopilotSetupProfile,
  previous: MailScoreResult | null,
): CopilotFinding {
  const result = resultFor(current, protocol);
  const comparison = compareFinding(protocol, current, previous);
  const explanation = explanationFor(protocol, current);
  const references = referencesFor(protocol, profile, current);
  return {
    id: COPILOT_FINDING_KEY_BY_PROTOCOL[protocol],
    key: COPILOT_FINDING_KEY_BY_PROTOCOL[protocol],
    protocol,
    label: protocolLabel(protocol),
    status: result.status,
    severity: severityFor(result.status),
    title: titleFor(protocol, current),
    summary: explanation,
    explanation,
    evidence: evidenceFor(protocol, current, previous),
    impact: impactFor(protocol, current),
    change: comparison.change,
    changed: comparison.summary,
    whatChanged: comparison.summary,
    changeSummary: comparison.summary,
    nextStep: nextStepFor(protocol, current, profile),
    steps: fixSteps(protocol, current, profile),
    references,
    sources: references,
  };
}

function scoreSummary(current: MailScoreResult, previous: MailScoreResult | null): CopilotScoreSummary {
  const comparable = previous && previous.domain.toLowerCase() === current.domain.toLowerCase() ? previous : null;
  const delta = comparable ? current.totalScore - comparable.totalScore : null;
  return {
    current: current.totalScore,
    previous: comparable?.totalScore ?? null,
    delta,
    direction: delta === null ? "not_compared" : delta > 0 ? "up" : delta < 0 ? "down" : "unchanged",
    complete: current.complete,
  };
}

function reportSummary(findings: CopilotFinding[]): CopilotReportSummary {
  const healthyCount = findings.filter((finding) => finding.status === "pass").length;
  const attentionCount = findings.filter((finding) => finding.status === "warn" || finding.status === "fail").length;
  const unknownCount = findings.filter((finding) => finding.status === "unknown").length;
  let headline = "All completed DNS health checks passed";
  if (attentionCount) headline = `${attentionCount} configuration ${attentionCount === 1 ? "area needs" : "areas need"} attention`;
  else if (unknownCount) headline = `${unknownCount} ${unknownCount === 1 ? "check is" : "checks are"} incomplete`;

  const parts = [`${healthyCount} passed`, `${attentionCount} need attention`, `${unknownCount} unknown`];
  const detail = `${parts.join("; ")}. Unknown observations are kept separate from configuration failures.`;
  return { headline, detail, healthyCount, attentionCount, unknownCount };
}

/** Builds a deterministic explanation from scan facts; it performs no network or model calls. */
export function buildCopilotReport(
  current: MailScoreResult,
  setupInput: unknown = null,
  previous: MailScoreResult | null = null,
): CopilotReport {
  const setup = normalizeSetupProfile(setupInput);
  const findings = PROTOCOLS.map((protocol) => buildFinding(protocol, current, setup, previous));
  const references = [...new Map(findings.flatMap((finding) => finding.references).map((reference) => [reference.id, reference])).values()];
  const summaryStats = reportSummary(findings);
  const changes = findings
    .filter((finding) => !["not_compared", "unchanged"].includes(finding.change))
    .map((finding) => finding.changeSummary);
  return {
    version: 1,
    domain: current.domain,
    generatedAt: current.scannedAt,
    setup,
    score: scoreSummary(current, previous),
    summary: `${summaryStats.headline}. ${summaryStats.detail}`,
    summaryStats,
    scopeNotice:
      "DeliveryWatch reports public DNS configuration health and observed IP blocklist results. It does not send a test message, measure inbox placement, guarantee delivery, or establish a provider outage.",
    whatChanged: changes,
    changes,
    findings,
    references,
  };
}

export function isCopilotFindingKey(value: string): value is CopilotFindingKey {
  return PROTOCOLS.includes(value as CopilotProtocol);
}

/** Looks up a stable protocol finding key such as `spf`, `dkim`, `dmarc`, `mx`, or `rbl`. */
export function findCopilotFinding(report: CopilotReport, key: string): CopilotFinding | undefined {
  if (!isCopilotFindingKey(key)) return undefined;
  return report.findings.find((finding) => finding.key === key);
}

/** Backwards-friendly alias for callers that describe this operation as a lookup. */
export const lookupCopilotFinding = findCopilotFinding;
