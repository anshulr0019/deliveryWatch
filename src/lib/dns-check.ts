import { Resolver } from "node:dns/promises";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CheckStatus = "pass" | "warn" | "fail";

export interface SpfResult {
  score: number;
  maxScore: 20;
  status: CheckStatus;
  found: boolean;
  record: string | null;
  qualifier: string | null;
  includes: string[];
  detectedProviders: string[];
  issues: string[];
  suggestions: string[];
}

export interface DkimResult {
  score: number;
  maxScore: 20;
  status: CheckStatus;
  found: boolean;
  keyBits: number | null;
  bestSelector: string | null;
  issues: string[];
  suggestions: string[];
}

export interface DmarcResult {
  score: number;
  maxScore: 20;
  status: CheckStatus;
  found: boolean;
  record: string | null;
  policy: string | null;
  issues: string[];
  suggestions: string[];
}

export interface MxResult {
  score: number;
  maxScore: 20;
  status: CheckStatus;
  found: boolean;
  records: { priority: number; exchange: string; provider: string | null }[];
  primaryProvider: string | null;
  hasBackup: boolean;
  issues: string[];
  suggestions: string[];
}

export interface RblResult {
  score: number;
  maxScore: 20;
  status: CheckStatus;
  ip: string | null;
  listedOn: string[];
  issues: string[];
  suggestions: string[];
}

export interface MailScoreResult {
  domain: string;
  totalScore: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  tier: "Excellent" | "Good" | "Needs Improvement" | "Poor" | "Critical";
  inboxProbability: number;
  spf: SpfResult;
  dkim: DkimResult;
  dmarc: DmarcResult;
  mx: MxResult;
  rbl: RblResult;
  scannedAt: string;
  scanDurationMs: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DNS_TIMEOUT_MS = 4000;

function makeResolver() {
  const r = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 2 });
  return r;
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch(() => {
      clearTimeout(t);
      resolve(fallback);
    });
  });
}

async function txt(resolver: Resolver, name: string): Promise<string[]> {
  const res = await withTimeout(resolver.resolveTxt(name), DNS_TIMEOUT_MS + 500, [] as string[][]);
  return res.map((chunks) => chunks.join(""));
}

export function normalizeDomain(input: string): string | null {
  let d = input.trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, "");
  d = d.replace(/^www\./, "");
  d = d.split("/")[0].split("?")[0].split("#")[0].split("@").pop() ?? "";
  d = d.replace(/\.$/, "");
  if (!d || d.length > 253) return null;
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(d)) return null;
  return d;
}

const PROVIDER_SIGNATURES: { match: RegExp; name: string }[] = [
  { match: /google|googlemail|gmail/i, name: "Google Workspace" },
  { match: /outlook|microsoft|office365|protection\.outlook/i, name: "Microsoft 365" },
  { match: /sendgrid/i, name: "SendGrid" },
  { match: /mailgun/i, name: "Mailgun" },
  { match: /amazonses|amazonaws/i, name: "Amazon SES" },
  { match: /zoho/i, name: "Zoho Mail" },
  { match: /mailchimp|mcsv|servers\.mcsv/i, name: "Mailchimp" },
  { match: /hubspot/i, name: "HubSpot" },
  { match: /postmark|mtasv/i, name: "Postmark" },
  { match: /sparkpost/i, name: "SparkPost" },
  { match: /protonmail|proton\.ch/i, name: "Proton Mail" },
  { match: /mimecast/i, name: "Mimecast" },
  { match: /pphosted|proofpoint/i, name: "Proofpoint" },
  { match: /brevo|sendinblue/i, name: "Brevo" },
  { match: /klaviyo/i, name: "Klaviyo" },
  { match: /salesforce|exacttarget/i, name: "Salesforce" },
  { match: /fastmail|messagingengine/i, name: "Fastmail" },
  { match: /icloud|apple/i, name: "iCloud Mail" },
  { match: /yandex/i, name: "Yandex" },
  { match: /godaddy|secureserver/i, name: "GoDaddy" },
  { match: /ovh/i, name: "OVH" },
  { match: /hostinger/i, name: "Hostinger" },
  { match: /mailjet/i, name: "Mailjet" },
  { match: /resend/i, name: "Resend" },
];

function detectProvider(host: string): string | null {
  for (const sig of PROVIDER_SIGNATURES) if (sig.match.test(host)) return sig.name;
  return null;
}

/* ------------------------------------------------------------------ */
/*  SPF                                                                */
/* ------------------------------------------------------------------ */

async function checkSpf(resolver: Resolver, domain: string): Promise<SpfResult> {
  const base: SpfResult = {
    score: 0,
    maxScore: 20,
    status: "fail",
    found: false,
    record: null,
    qualifier: null,
    includes: [],
    detectedProviders: [],
    issues: [],
    suggestions: [],
  };

  const records = await txt(resolver, domain);
  const spfRecords = records.filter((r) => /^v=spf1(\s|$)/i.test(r.trim()));

  if (spfRecords.length === 0) {
    base.issues.push("No SPF record found on the root domain.");
    base.suggestions.push(
      `Add a TXT record on ${domain}: "v=spf1 include:<your-provider> -all" listing every service authorized to send email.`,
    );
    return base;
  }

  const record = spfRecords[0];
  base.found = true;
  base.record = record;

  if (spfRecords.length > 1) {
    base.issues.push(`Multiple SPF records found (${spfRecords.length}). RFC 7208 requires exactly one — receivers will treat this as a permanent error.`);
    base.suggestions.push("Merge all SPF mechanisms into a single TXT record.");
  }

  const terms = record.split(/\s+/).slice(1);
  const includes = terms.filter((t) => /^[+\-~?]?include:/i.test(t)).map((t) => t.replace(/^[+\-~?]?include:/i, ""));
  base.includes = includes;
  base.detectedProviders = Array.from(new Set(includes.map(detectProvider).filter((p): p is string => !!p)));

  const allTerm = terms.find((t) => /^[+\-~?]?all$/i.test(t));
  const qualifier = allTerm ? (allTerm.length === 3 ? "+" : allTerm[0]) : null;
  base.qualifier = qualifier;

  // DNS lookup count heuristic (include, a, mx, ptr, exists, redirect)
  const lookupTerms = terms.filter((t) => /^[+\-~?]?(include:|a$|a:|mx$|mx:|ptr|exists:|redirect=)/i.test(t)).length;

  let score = 20;
  if (!allTerm) {
    score -= 8;
    base.issues.push("SPF record has no 'all' mechanism — unlisted senders are implicitly neutral.");
    base.suggestions.push("Terminate your SPF record with '-all' (hard fail) or '~all' (soft fail).");
  } else if (qualifier === "+") {
    score -= 15;
    base.issues.push("'+all' authorizes the entire internet to send as your domain.");
    base.suggestions.push("Replace '+all' with '-all' immediately.");
  } else if (qualifier === "?") {
    score -= 8;
    base.issues.push("'?all' (neutral) provides no protection against spoofing.");
    base.suggestions.push("Use '~all' or, preferably, '-all'.");
  } else if (qualifier === "~") {
    score -= 3;
    base.issues.push("'~all' (soft fail) is acceptable but weaker than a hard fail.");
    base.suggestions.push("Once you have confirmed all legitimate senders are listed, move to '-all'.");
  }

  if (lookupTerms > 10) {
    score -= 8;
    base.issues.push(`SPF record likely exceeds the 10 DNS-lookup limit (${lookupTerms} lookup mechanisms found).`);
    base.suggestions.push("Flatten includes or remove unused services to stay under 10 lookups.");
  } else if (lookupTerms >= 8) {
    score -= 2;
    base.issues.push(`SPF record is close to the 10 DNS-lookup limit (${lookupTerms}).`);
    base.suggestions.push("Audit includes before adding any new sending service.");
  }

  if (terms.some((t) => /^[+\-~?]?ptr/i.test(t))) {
    score -= 3;
    base.issues.push("The 'ptr' mechanism is deprecated and slow for receivers to evaluate.");
    base.suggestions.push("Remove 'ptr' and use ip4/ip6/include instead.");
  }

  if (record.length > 255 && spfRecords.length === 1) {
    base.issues.push("SPF string is longer than 255 characters; make sure it is split into multiple quoted strings.");
  }

  base.score = Math.max(0, Math.min(20, score));
  base.status = base.score >= 17 ? "pass" : base.score >= 10 ? "warn" : "fail";
  return base;
}

/* ------------------------------------------------------------------ */
/*  DKIM                                                               */
/* ------------------------------------------------------------------ */

const DKIM_SELECTORS = [
  "default",
  "google",
  "selector1",
  "selector2",
  "k1",
  "k2",
  "k3",
  "s1",
  "s2",
  "dkim",
  "mail",
  "smtp",
  "mandrill",
  "mailjet",
  "zoho",
  "zmail",
  "pm",
  "protonmail",
  "protonmail2",
  "protonmail3",
  "amazonses",
  "mxvault",
  "everlytickey1",
  "everlytickey2",
  "hs1",
  "hs2",
  "cm",
  "sendgrid",
  "smtpapi",
  "m1",
  "sig1",
  "krs",
  "fm1",
  "fm2",
  "fm3",
  "resend",
];

function decodeKeyBits(p: string): number | null {
  try {
    const buf = Buffer.from(p, "base64");
    if (buf.length === 0) return null;
    // Rough: DER-encoded SubjectPublicKeyInfo for RSA. Estimate modulus size.
    // Common sizes: 1024-bit ~ 162 bytes, 2048-bit ~ 294 bytes, 4096-bit ~ 550 bytes
    if (buf.length >= 500) return 4096;
    if (buf.length >= 260) return 2048;
    if (buf.length >= 140) return 1024;
    if (buf.length >= 30) return 256; // ed25519
    return null;
  } catch {
    return null;
  }
}

async function checkDkim(resolver: Resolver, domain: string): Promise<DkimResult> {
  const base: DkimResult = {
    score: 0,
    maxScore: 20,
    status: "fail",
    found: false,
    keyBits: null,
    bestSelector: null,
    issues: [],
    suggestions: [],
  };

  const lookups = await Promise.all(
    DKIM_SELECTORS.map(async (sel) => {
      const recs = await txt(resolver, `${sel}._domainkey.${domain}`);
      const rec = recs.find((r) => /v=DKIM1|p=/i.test(r));
      return rec ? { sel, rec } : null;
    }),
  );

  const found = lookups.filter((x): x is { sel: string; rec: string } => !!x);

  if (found.length === 0) {
    base.issues.push(`No DKIM public key found on ${DKIM_SELECTORS.length} common selectors.`);
    base.suggestions.push("Enable DKIM signing in your email provider and publish the selector._domainkey TXT record it gives you.");
    base.suggestions.push("If you use a custom selector, DKIM may be configured but undetectable by selector guessing.");
    return base;
  }

  base.found = true;

  let best: { sel: string; bits: number | null; revoked: boolean } | null = null;
  for (const f of found) {
    const pMatch = f.rec.match(/(?:^|;)\s*p=([^;]*)/i);
    const p = pMatch ? pMatch[1].replace(/\s+/g, "") : "";
    const revoked = p.length === 0;
    const bits = revoked ? null : decodeKeyBits(p);
    if (!best || (bits ?? 0) > (best.bits ?? 0)) best = { sel: f.sel, bits, revoked };
  }

  base.bestSelector = best?.sel ?? found[0].sel;
  base.keyBits = best?.bits ?? null;

  let score = 20;
  if (best?.revoked) {
    score = 4;
    base.issues.push(`Selector '${best.sel}' has an empty public key (revoked).`);
    base.suggestions.push("Rotate to a fresh DKIM key pair and publish the new public key.");
  } else if (base.keyBits !== null && base.keyBits < 1024) {
    score = 8;
    base.issues.push(`DKIM key is very short (${base.keyBits}-bit).`);
    base.suggestions.push("Rotate to a 2048-bit RSA key.");
  } else if (base.keyBits === 1024) {
    score = 14;
    base.issues.push("DKIM key is 1024-bit. Google and Microsoft recommend 2048-bit keys.");
    base.suggestions.push("Rotate to a 2048-bit RSA key in your provider's DKIM settings.");
  }

  if (found.length === 1) {
    base.suggestions.push("Consider publishing a second selector to enable zero-downtime key rotation.");
  }

  base.score = Math.max(0, Math.min(20, score));
  base.status = base.score >= 17 ? "pass" : base.score >= 10 ? "warn" : "fail";
  return base;
}

/* ------------------------------------------------------------------ */
/*  DMARC                                                              */
/* ------------------------------------------------------------------ */

async function checkDmarc(resolver: Resolver, domain: string): Promise<DmarcResult> {
  const base: DmarcResult = {
    score: 0,
    maxScore: 20,
    status: "fail",
    found: false,
    record: null,
    policy: null,
    issues: [],
    suggestions: [],
  };

  const records = await txt(resolver, `_dmarc.${domain}`);
  const dmarc = records.filter((r) => /^v=DMARC1/i.test(r.trim()));

  if (dmarc.length === 0) {
    base.issues.push("No DMARC record found. Gmail & Yahoo now require DMARC for bulk senders.");
    base.suggestions.push(
      `Publish a TXT record at _dmarc.${domain}: "v=DMARC1; p=none; rua=mailto:dmarc@${domain}" and tighten to quarantine/reject once reports look clean.`,
    );
    return base;
  }

  const record = dmarc[0];
  base.found = true;
  base.record = record;

  const tags: Record<string, string> = {};
  for (const part of record.split(";")) {
    const [k, ...v] = part.split("=");
    if (k && v.length) tags[k.trim().toLowerCase()] = v.join("=").trim();
  }

  const policy = (tags["p"] ?? "").toLowerCase() || null;
  base.policy = policy;

  let score = 0;
  if (policy === "reject") score = 20;
  else if (policy === "quarantine") score = 16;
  else if (policy === "none") {
    score = 9;
    base.issues.push("Policy is 'p=none' — spoofed mail is monitored but still delivered.");
    base.suggestions.push("Move to 'p=quarantine' and then 'p=reject' once your aggregate reports show only legitimate sources.");
  } else {
    score = 3;
    base.issues.push("DMARC record is missing a valid 'p=' policy tag.");
    base.suggestions.push("Add 'p=none', 'p=quarantine' or 'p=reject' to the record.");
  }

  if (dmarc.length > 1) {
    score -= 6;
    base.issues.push("Multiple DMARC records found — receivers will ignore all of them.");
    base.suggestions.push("Keep exactly one _dmarc TXT record.");
  }

  if (!tags["rua"]) {
    score -= 3;
    base.issues.push("No 'rua' aggregate reporting address — you are blind to spoofing attempts.");
    base.suggestions.push(`Add rua=mailto:dmarc-reports@${domain} to receive aggregate reports.`);
  }

  const pct = tags["pct"] ? parseInt(tags["pct"], 10) : 100;
  if (!Number.isNaN(pct) && pct < 100 && policy !== "none") {
    score -= 2;
    base.issues.push(`Policy only applies to ${pct}% of mail (pct=${pct}).`);
    base.suggestions.push("Raise pct to 100 when you are confident in your configuration.");
  }

  const sp = (tags["sp"] ?? "").toLowerCase();
  if (policy === "reject" && sp && sp !== "reject") {
    score -= 1;
    base.issues.push(`Subdomain policy 'sp=${sp}' is weaker than the organisational policy.`);
  }

  base.score = Math.max(0, Math.min(20, score));
  base.status = base.score >= 16 ? "pass" : base.score >= 9 ? "warn" : "fail";
  return base;
}

/* ------------------------------------------------------------------ */
/*  MX                                                                 */
/* ------------------------------------------------------------------ */

async function checkMx(resolver: Resolver, domain: string): Promise<MxResult> {
  const base: MxResult = {
    score: 0,
    maxScore: 20,
    status: "fail",
    found: false,
    records: [],
    primaryProvider: null,
    hasBackup: false,
    issues: [],
    suggestions: [],
  };

  const mx = await withTimeout(resolver.resolveMx(domain), DNS_TIMEOUT_MS + 500, [] as { priority: number; exchange: string }[]);

  if (mx.length === 0) {
    base.issues.push("No MX records found — this domain cannot receive email (and bounces/replies will fail).");
    base.suggestions.push("Publish MX records pointing at your mail provider's inbound servers.");
    return base;
  }

  const sorted = [...mx].sort((a, b) => a.priority - b.priority);
  base.found = true;
  base.records = sorted.map((r) => ({
    priority: r.priority,
    exchange: r.exchange.replace(/\.$/, ""),
    provider: detectProvider(r.exchange),
  }));
  base.primaryProvider = base.records[0].provider;
  base.hasBackup = sorted.length > 1;

  let score = 20;
  if (sorted.length === 1) {
    score -= 3;
    base.issues.push("Only one MX record — no redundancy if the mail server is unreachable.");
    base.suggestions.push("Add a secondary MX with a higher priority value.");
  }

  const nullMx = sorted.some((r) => r.exchange === "" || r.exchange === ".");
  if (nullMx) {
    score = 2;
    base.issues.push("A Null MX (RFC 7505) record is published — the domain explicitly refuses email.");
  }

  const ipLike = sorted.filter((r) => /^\d{1,3}(\.\d{1,3}){3}$/.test(r.exchange));
  if (ipLike.length) {
    score -= 6;
    base.issues.push("MX records must point to hostnames, not IP addresses.");
    base.suggestions.push("Replace IP-based MX entries with A-record hostnames.");
  }

  // Verify at least the primary MX resolves.
  const primaryHost = base.records[0].exchange;
  const addrs = await withTimeout(resolver.resolve4(primaryHost), DNS_TIMEOUT_MS + 500, [] as string[]);
  const addrs6 = addrs.length ? [] : await withTimeout(resolver.resolve6(primaryHost), DNS_TIMEOUT_MS + 500, [] as string[]);
  if (!addrs.length && !addrs6.length && !nullMx) {
    score -= 8;
    base.issues.push(`Primary MX host ${primaryHost} does not resolve to an IP address.`);
    base.suggestions.push("Fix the A/AAAA record for the MX hostname.");
  }

  base.score = Math.max(0, Math.min(20, score));
  base.status = base.score >= 17 ? "pass" : base.score >= 10 ? "warn" : "fail";
  return base;
}

/* ------------------------------------------------------------------ */
/*  RBL / Blacklists                                                   */
/* ------------------------------------------------------------------ */

export const RBL_ZONES = [
  { zone: "zen.spamhaus.org", name: "Spamhaus ZEN" },
  { zone: "b.barracudacentral.org", name: "Barracuda" },
  { zone: "bl.spamcop.net", name: "SpamCop" },
  { zone: "dnsbl.sorbs.net", name: "SORBS" },
  { zone: "dnsbl-1.uceprotect.net", name: "UCEPROTECT L1" },
  { zone: "psbl.surriel.com", name: "PSBL" },
  { zone: "dnsbl.dronebl.org", name: "DroneBL" },
  { zone: "cbl.abuseat.org", name: "CBL Abuseat" },
] as const;

async function checkRbl(resolver: Resolver, domain: string, mxHosts: string[]): Promise<RblResult> {
  const base: RblResult = {
    score: 20,
    maxScore: 20,
    status: "pass",
    ip: null,
    listedOn: [],
    issues: [],
    suggestions: [],
  };

  // Determine the IP to test: primary MX A record, else domain A record.
  let ip: string | null = null;
  for (const host of [...mxHosts, domain]) {
    const a = await withTimeout(resolver.resolve4(host), DNS_TIMEOUT_MS + 500, [] as string[]);
    if (a.length) {
      ip = a[0];
      break;
    }
  }

  if (!ip) {
    base.score = 12;
    base.status = "warn";
    base.issues.push("Could not determine a sending/receiving IPv4 address to check against blacklists.");
    base.suggestions.push("Ensure your MX hostnames resolve to public IPv4 addresses.");
    return base;
  }

  base.ip = ip;
  const reversed = ip.split(".").reverse().join(".");

  const results = await Promise.all(
    RBL_ZONES.map(async (z) => {
      const answer = await withTimeout(resolver.resolve4(`${reversed}.${z.zone}`), DNS_TIMEOUT_MS + 500, null as string[] | null);
      if (!answer || answer.length === 0) return null;
      // Only 127.0.0.x style answers are real listings; some zones return 127.255.255.x for errors/blocked queries.
      const listed = answer.some((a) => a.startsWith("127.") && !a.startsWith("127.255."));
      return listed ? (z.name as string) : null;
    }),
  );

  base.listedOn = results.filter((r): r is string => typeof r === "string");

  if (base.listedOn.length > 0) {
    const critical = base.listedOn.some((n) => /Spamhaus|Barracuda|SpamCop/.test(n));
    base.score = critical ? 0 : Math.max(0, 20 - base.listedOn.length * 6);
    base.status = base.score >= 10 ? "warn" : "fail";
    base.issues.push(`IP ${ip} is listed on ${base.listedOn.length} blacklist${base.listedOn.length > 1 ? "s" : ""}: ${base.listedOn.join(", ")}.`);
    base.suggestions.push("Identify the source of abuse (compromised account, open relay, misconfigured forwarder) and stop it first.");
    base.suggestions.push("Request delisting via each blacklist's removal form once the issue is resolved.");
  }

  return base;
}

/* ------------------------------------------------------------------ */
/*  Aggregate                                                          */
/* ------------------------------------------------------------------ */

export function gradeFor(total: number): MailScoreResult["grade"] {
  if (total >= 95) return "A+";
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  if (total >= 40) return "D";
  return "F";
}

export function tierFor(total: number): MailScoreResult["tier"] {
  if (total >= 85) return "Excellent";
  if (total >= 70) return "Good";
  if (total >= 55) return "Needs Improvement";
  if (total >= 40) return "Poor";
  return "Critical";
}

export async function checkDomain(rawDomain: string): Promise<MailScoreResult> {
  const started = Date.now();
  const domain = normalizeDomain(rawDomain);
  if (!domain) throw new Error("Invalid domain name");

  const resolver = makeResolver();

  const [spf, dkim, dmarc, mx] = await Promise.all([
    checkSpf(resolver, domain),
    checkDkim(resolver, domain),
    checkDmarc(resolver, domain),
    checkMx(resolver, domain),
  ]);

  const rbl = await checkRbl(
    resolver,
    domain,
    mx.records.map((r) => r.exchange),
  );

  const totalScore = Math.max(0, Math.min(100, spf.score + dkim.score + dmarc.score + mx.score + rbl.score));

  // Inbox probability: weighted; blacklisting is disproportionately damaging.
  let inbox = totalScore;
  if (rbl.listedOn.length > 0) inbox = Math.min(inbox, 35);
  if (!spf.found && !dkim.found) inbox = Math.min(inbox, 45);
  if (!mx.found) inbox = Math.min(inbox, 30);
  const inboxProbability = Math.round(Math.max(2, Math.min(99, inbox)));

  return {
    domain,
    totalScore,
    grade: gradeFor(totalScore),
    tier: tierFor(totalScore),
    inboxProbability,
    spf,
    dkim,
    dmarc,
    mx,
    rbl,
    scannedAt: new Date().toISOString(),
    scanDurationMs: Date.now() - started,
  };
}
