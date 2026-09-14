import { createHash, createPublicKey } from "node:crypto";
import { isIP } from "node:net";
import { Resolver } from "node:dns/promises";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";

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
  keyFingerprint?: string;
  selectors?: { selector: string; fingerprint: string }[];
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
  source?: "configured" | "mx";
  providers?: { name: string; status: "listed" | "clear" | "unavailable" }[];
  issues: string[];
  suggestions: string[];
}

export interface MailScoreResult {
  domain: string;
  totalScore: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  tier: "Excellent" | "Good" | "Needs Improvement" | "Poor" | "Critical";
  complete: boolean;
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

async function dnsLookup<T>(promise: Promise<T>, empty: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS lookup timed out")), DNS_TIMEOUT_MS + 500);
    })]);
  } catch (error) {
    if (["ENOTFOUND", "ENODATA"].includes((error as NodeJS.ErrnoException).code ?? "")) return empty;
    throw error;
  } finally { clearTimeout(timer); }
}

async function txt(resolver: Resolver, name: string): Promise<string[]> {
  return (await dnsLookup(resolver.resolveTxt(name), [] as string[][])).map((chunks) => chunks.join(""));
}

export function normalizeDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
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

/** Structural SPF audit. Without an envelope sender/IP this is not an SMTP SPF verdict. */
async function checkSpf(resolver: Resolver, domain: string): Promise<SpfResult> {
  const base: SpfResult = { score: 0, maxScore: 20, status: "fail", found: false, record: null, qualifier: null, includes: [], detectedProviders: [], issues: [], suggestions: [] };
  let lookupCount = 0;
  let limited = false;
  const recordsSeen: string[] = [];
  async function audit(name: string, path: Set<string>): Promise<string | null> {
    if (path.has(name)) throw new Error(`SPF include/redirect cycle at ${name}.`);
    const records = (await txt(resolver, name)).filter(r => /^v=spf1(?:\s|$)/i.test(r));
    if (name === domain) { base.found = records.length > 0; base.record = records[0] ?? null; }
    if (records.length !== 1) throw new Error(records.length ? `Multiple SPF records at ${name}. Keep exactly one.` : `No SPF record at ${name}.`);
    const record = records[0]; recordsSeen.push(record);
    const terms = record.trim().split(/\s+/).slice(1);
    const all = terms.find(t => /^[+~?-]?all$/i.test(t));
    const redirects = terms.filter(t => /^redirect=/i.test(t));
    if (redirects.length > 1) throw new Error(`Multiple redirect modifiers at ${name}.`);
    const seenModifiers = new Set<string>();
    for (const term of terms) {
      if (/^[a-z][a-z0-9_.-]*=/i.test(term)) {
        const key = term.split("=")[0].toLowerCase();
        if (seenModifiers.has(key)) throw new Error(`Duplicate SPF modifier ${key}.`);
        seenModifiers.add(key);
        if (!term.slice(key.length + 1)) throw new Error(`Empty SPF modifier ${key}.`);
        continue;
      }
      const mechanism = term.replace(/^[+~?-]/, "");
      const ip = mechanism.match(/^(ip4|ip6):([^/]+)(?:\/(\d+))?$/i);
      if (ip) {
        const family = ip[1].toLowerCase() === "ip4" ? 4 : 6;
        if (isIP(ip[2]) !== family || (ip[3] !== undefined && Number(ip[3]) > (family === 4 ? 32 : 128))) throw new Error(`Invalid SPF address: ${term}.`);
      } else if (!/^(?:all|include:.+|exists:.+|ptr(?::.+)?|a(?::[^/]+)?(?:\/\d+)?(?:\/\/\d+)?|mx(?::[^/]+)?(?:\/\d+)?(?:\/\/\d+)?)$/i.test(mechanism)) {
        throw new Error(`Unsupported or invalid SPF mechanism: ${term}.`);
      }
    }
    for (const term of terms) {
      if (/^[+~?-]?all$/i.test(term)) break; // later mechanisms are unreachable
      const mechanism = term.replace(/^[+~?-]/, "");
      if (/^(?:include:|a(?=[:/]|$)|mx(?=[:/]|$)|ptr(?=:|$)|exists:)/i.test(mechanism)) {
        if (++lookupCount > 10) throw new Error("SPF exceeds the 10 DNS-lookup mechanism limit across includes/redirects.");
      }
      if (/^include:/i.test(mechanism)) {
        const target = mechanism.slice(8).toLowerCase(); base.includes.push(target);
        if (target.includes("%")) { limited = true; continue; }
        if (!normalizeDomain(target)) throw new Error(`Invalid SPF include target: ${target}.`);
        await audit(target, new Set([...path, name]));
      } else if (/^(?:a|mx|ptr|exists)(?=[:/]|$)/i.test(mechanism)) {
        // Sender-dependent mechanisms need a real SMTP identity for a full evaluation.
        limited = true;
      }
    }
    if (!all && redirects.length) {
      if (++lookupCount > 10) throw new Error("SPF exceeds the 10 DNS-lookup mechanism limit.");
      const target = redirects[0].slice(9).toLowerCase();
      if (target.includes("%")) { limited = true; return null; }
      if (!normalizeDomain(target)) throw new Error("Invalid SPF redirect target.");
      return audit(target, new Set([...path, name]));
    }
    return all ? (all.length === 3 ? "+" : all[0]) : null;
  }
  try { base.qualifier = await audit(domain, new Set()); }
  catch (error) {
    // DNS transport errors are observations we could not make, never permanent DNS failures.
    if ((error as NodeJS.ErrnoException).code || (error as Error).message.includes("timed out")) {
      base.status = "unknown"; base.issues.push("SPF lookup unavailable. Retry before changing DNS."); return base;
    }
    base.issues.push((error as Error).message); base.suggestions.push("Correct the SPF record and its include/redirect targets, then scan again."); return base;
  }
  base.detectedProviders = [...new Set([...base.includes, ...recordsSeen].map(detectProvider).filter((v): v is string => !!v))];
  base.score = base.qualifier === "-" ? 20 : base.qualifier === "~" ? 17 : base.qualifier === "+" ? 0 : 10;
  base.status = base.score >= 17 ? "pass" : base.score >= 10 ? "warn" : "fail";
  if (base.qualifier === "+") base.issues.push("+all authorizes every sender. Replace it after identifying legitimate senders.");
  if (!base.qualifier) base.issues.push("No terminal all mechanism was resolved; unmatched senders may be neutral.");
  if (limited) { base.status = "unknown"; base.issues.push("Sender-dependent mechanisms/macros need an envelope sender and sending IP. This domain-only audit cannot fully evaluate them."); }
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

export function parseDkimKey(record: string): { bits: number; fingerprint: string; algorithm: string } | null {
  try {
    const tags: Record<string, string> = {};
    for (const item of record.split(";")) {
      const equal = item.indexOf("="); if (equal < 0) continue;
      const name = item.slice(0, equal).trim();
      if (name in tags) return null;
      tags[name] = item.slice(equal + 1).trim();
    }
    if (tags.v && tags.v !== "DKIM1") return null;
    const p = (tags.p ?? "").replace(/\s/g, "");
    if (!p || !/^[A-Za-z0-9+/]+={0,2}$/.test(p)) return null;
    const key = Buffer.from(p, "base64");
    if (key.toString("base64").replace(/=+$/, "") !== p.replace(/=+$/, "")) return null;
    const algorithm = tags.k ?? "rsa";
    let bits: number;
    if (algorithm === "ed25519") { if (key.length !== 32) return null; bits = 256; }
    else if (algorithm === "rsa") {
      const publicKey = createPublicKey({ key, format: "der", type: "spki" });
      if (publicKey.asymmetricKeyType !== "rsa") return null;
      bits = publicKey.asymmetricKeyDetails?.modulusLength ?? 0;
      if (!bits) return null;
    } else return null;
    return { bits, algorithm, fingerprint: createHash("sha256").update(key).digest("hex") };
  } catch { return null; }
}

async function checkDkim(resolver: Resolver, domain: string, selectors: string[] = []): Promise<DkimResult> {
  const base: DkimResult = { score: 0, maxScore: 20, status: "unknown", found: false, keyBits: null, bestSelector: null, issues: [], suggestions: [] };
  const names = selectors.length ? selectors : DKIM_SELECTORS;
  const lookups = await Promise.allSettled(names.map(async selector => ({ selector, records: await txt(resolver, `${selector}._domainkey.${domain}`) })));
  const found = lookups.flatMap(r => r.status === "fulfilled" ? r.value.records.filter(rec => /(?:^|;)\s*(?:v=DKIM1|p=)/.test(rec)).map(record => ({ selector: r.value.selector, record })) : []);
  base.found = found.length > 0;
  const parsed = found.map(f => ({ ...f, key: parseDkimKey(f.record) }));
  const valid = parsed.filter(f => f.key && (f.key.algorithm === "ed25519" || f.key.bits >= 1024));
  valid.sort((a, b) => (b.key!.algorithm === "ed25519" ? 2048 : b.key!.bits) - (a.key!.algorithm === "ed25519" ? 2048 : a.key!.bits));
  base.selectors = parsed.map(f => ({ selector: f.selector, fingerprint: createHash("sha256").update(f.record.replace(/\s/g, "")).digest("hex") })).sort((a,b) => a.selector.localeCompare(b.selector));
  const best = valid[0];
  if (best?.key) {
    base.bestSelector = best.selector; base.keyBits = best.key.bits; base.keyFingerprint = best.key.fingerprint;
    base.score = best.key.algorithm === "ed25519" || best.key.bits >= 2048 ? 20 : 14;
    base.status = base.score === 20 ? "pass" : "warn";
    if (base.score < 20) base.suggestions.push("Consider rotating RSA keys to 2048 bits.");
    if (parsed.some(f => !f.key)) { base.status = "warn"; base.issues.push("Another discovered selector contains an invalid or revoked key. Review its use before removal."); }
  } else if (found.length || selectors.length) {
    base.status = "fail"; base.issues.push(found.length ? "Discovered DKIM keys are invalid, revoked, or below the minimum RSA key size." : "No DKIM key found at the configured selectors.");
  } else {
    base.issues.push("No key discovered on common selectors. This does not prove DKIM is missing.");
    base.suggestions.push("Enter your provider's DKIM selector for an explicit lookup. DNS presence alone does not verify message signing.");
  }
  if (lookups.some(r => r.status === "rejected")) { base.status = "unknown"; base.issues.push("Some DKIM lookups were unavailable. Retry before changing DNS."); }
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
      `Publish one valid DMARC TXT record at _dmarc.${domain}. Start with p=none while validating legitimate senders, and use a reporting mailbox that you control.`,
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
    base.issues.push("Policy is the valid monitoring mode 'p=none'; it requests reporting without quarantine or rejection, while receivers continue applying their own filtering.");
    base.suggestions.push("Move to 'p=quarantine' and then 'p=reject' once your aggregate reports show only legitimate sources.");
  } else {
    score = 3;
    base.issues.push("DMARC record is missing a valid 'p=' policy tag.");
    base.suggestions.push("Add 'p=none', 'p=quarantine' or 'p=reject' to the record.");
  }

  if (dmarc.length > 1) {
    score = 0;
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

  const mx = await dnsLookup(resolver.resolveMx(domain), [] as { priority: number; exchange: string }[]);

  if (mx.length === 0) {
    base.issues.push("No explicit MX records found. Inbound SMTP may fall back to the domain address; confirm routing with your provider.");
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
  const addrs = nullMx ? [] : await dnsLookup(resolver.resolve4(primaryHost), [] as string[]);
  const addrs6 = nullMx || addrs.length ? [] : await dnsLookup(resolver.resolve6(primaryHost), [] as string[]);
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
  { zone: "dnsbl-1.uceprotect.net", name: "UCEPROTECT L1" },
  { zone: "psbl.surriel.com", name: "PSBL" },
  { zone: "dnsbl.dronebl.org", name: "DroneBL" },
  { zone: "cbl.abuseat.org", name: "CBL Abuseat" },
] as const;

async function checkRbl(resolver: Resolver, mxHosts: string[], sendingIp?: string): Promise<RblResult> {
  const base: RblResult = { score: 0, maxScore: 20, status: "unknown", ip: sendingIp ?? null, source: sendingIp ? "configured" : "mx", listedOn: [], issues: [], suggestions: [] };
  if (!base.ip) {
    for (const host of mxHosts.slice(0, 3)) {
      try { base.ip = (await dnsLookup(resolver.resolve4(host), [] as string[]))[0] ?? null; } catch { /* next MX may resolve */ }
      if (base.ip) break;
    }
    base.suggestions.push("This is an inbound MX address, not a verified outbound sender. Configure a sending IPv4 address to monitor its reputation.");
  }
  if (!base.ip) { base.issues.push("No IPv4 address available for reputation checks."); return base; }
  const reversed = base.ip.split(".").reverse().join(".");
  base.providers = await Promise.all(RBL_ZONES.map(async z => {
    try {
      const answer = await dnsLookup(resolver.resolve4(`${reversed}.${z.zone}`), [] as string[]);
      const listed = answer.some(a => /^127\.0\.0\.\d+$/.test(a));
      const status = listed ? "listed" : answer.length ? "unavailable" : "clear";
      return { name: z.name as string, status: status as "listed" | "clear" | "unavailable" };
    } catch { return { name: z.name as string, status: "unavailable" as const }; }
  }));
  base.listedOn = base.providers.filter(p => p.status === "listed").map(p => p.name);
  const unavailable = base.providers.filter(p => p.status === "unavailable");
  if (base.listedOn.length) {
    base.status = "fail"; base.score = 0;
    base.issues.push(`IP ${base.ip} is listed on ${base.listedOn.join(", ")}. Confirm the address belongs to your sending infrastructure before acting.`);
  } else if (!unavailable.length) { base.status = "pass"; base.score = 20; }
  if (unavailable.length) base.issues.push(`Could not verify: ${unavailable.map(p => p.name).join(", ")}. Unavailable queries are not clean results.`);
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

export interface ScanOptions { dkimSelectors?: string[]; sendingIp?: string; }

export function parseScanOptions(input: Record<string, unknown>): ScanOptions {
  const selectors = input.dkimSelectors ?? [];
  if (!Array.isArray(selectors) || selectors.length > 5 || selectors.some(s => typeof s !== "string" || !/^[a-zA-Z0-9_-]{1,63}(?:\.[a-zA-Z0-9_-]{1,63})*$/.test(s) || s.length > 120)) throw new Error("Use up to five valid DKIM selectors.");
  const sendingIp = input.sendingIp;
  if (sendingIp !== undefined && sendingIp !== "" && (typeof sendingIp !== "string" || isIP(sendingIp) !== 4)) throw new Error("Sending IP must be an IPv4 address.");
  return { dkimSelectors: [...new Set(selectors as string[])], ...(sendingIp ? { sendingIp: sendingIp as string } : {}) };
}

export async function checkDomain(rawDomain: string, options: ScanOptions = {}): Promise<MailScoreResult> {
  const started = Date.now();
  const domain = normalizeDomain(rawDomain);
  if (!domain) throw new Error("Invalid domain name");
  const resolver = makeResolver();
  // On transport failure return an explicit unknown result, with the same shape as a missing record.
  async function observe<T extends { status: CheckStatus; score: number; issues: string[] }>(run: (r: Resolver) => Promise<T>): Promise<T> {
    try { return await run(resolver); }
    catch {
      const empty = { resolveTxt: async () => [], resolveMx: async () => [], resolve4: async () => [], resolve6: async () => [] } as unknown as Resolver;
      const result = await run(empty);
      return { ...result, status: "unknown", score: 0, issues: ["DNS lookup unavailable. Retry before changing records."], suggestions: [] };
    }
  }
  const deadline = setTimeout(() => resolver.cancel(), 18000);
  try {
    const [spf, dkim, dmarc, mx] = await Promise.all([
      observe(r => checkSpf(r, domain)), observe(r => checkDkim(r, domain, options.dkimSelectors)),
      observe(r => checkDmarc(r, domain)), observe(r => checkMx(r, domain)),
    ]);
    const rbl = await checkRbl(resolver, mx.records.map(r => r.exchange), options.sendingIp);
    for (const result of [spf, dkim, dmarc, mx, rbl]) if (result.status === "unknown") result.score = 0;
    const totalScore = spf.score + dkim.score + dmarc.score + mx.score + rbl.score;
    const complete = [spf, dkim, dmarc, mx, rbl].every(r => r.status !== "unknown") && !rbl.providers?.some(p => p.status === "unavailable");
    return { domain, totalScore, grade: gradeFor(totalScore), tier: tierFor(totalScore), complete, spf, dkim, dmarc, mx, rbl, scannedAt: new Date().toISOString(), scanDurationMs: Date.now() - started };
  } finally { clearTimeout(deadline); resolver.cancel(); }
}
