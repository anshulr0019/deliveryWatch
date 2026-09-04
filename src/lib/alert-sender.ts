import { createHmac } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { alertChannels, type AlertChannel } from "@/db/schema";
import type { DetectedEvent } from "@/lib/change-detector";

export interface AlertContext {
  domain: string;
  domainId: string;
  score: number;
  previousScore?: number;
  event: DetectedEvent;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SEVERITY_EMOJI: Record<string, string> = { critical: "🚨", warning: "⚠️", info: "ℹ️" };
const SEVERITY_COLOR: Record<string, string> = { critical: "#F87171", warning: "#FBBF24", info: "#C8A96E" };

/* ---------------------------- rate limiting ---------------------------- */
// Max 10 alerts per user per hour (in-memory; sufficient per serverless instance / cron run).
const rateBuckets = new Map<string, number[]>();
function allow(userId: string): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (arr.length >= 10) return false;
  arr.push(now);
  rateBuckets.set(userId, arr);
  return true;
}

/* ------------------------------ templates ------------------------------ */

function emailHtml(ctx: AlertContext): string {
  const { event, domain, score } = ctx;
  const color = SEVERITY_COLOR[event.severity] ?? "#C8A96E";
  return `<!doctype html><html><body style="margin:0;background:#060709;font-family:Inter,Segoe UI,Arial,sans-serif;color:#fff;padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="560" style="max-width:560px;background:#0B0D12;border:1px solid rgba(200,169,110,0.35);border-radius:16px;padding:32px">
    <tr><td style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#C8A96E;font-weight:600">DeliverWatch Alert</td></tr>
    <tr><td style="padding-top:12px;font-size:22px;font-weight:600;color:#fff">${SEVERITY_EMOJI[event.severity] ?? ""} ${escapeHtml(event.title)}</td></tr>
    <tr><td style="padding-top:8px;font-size:14px;color:#94A3B8;line-height:1.6">${escapeHtml(event.description)}</td></tr>
    <tr><td style="padding-top:24px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#12151C;border:1px solid rgba(255,255,255,0.08);border-radius:12px">
        <tr>
          <td style="padding:16px;font-size:13px;color:#888">Domain<br><span style="color:#fff;font-size:16px;font-weight:600">${escapeHtml(domain)}</span></td>
          <td style="padding:16px;font-size:13px;color:#888">Severity<br><span style="color:${color};font-size:16px;font-weight:600;text-transform:capitalize">${event.severity}</span></td>
          <td style="padding:16px;font-size:13px;color:#888">Score<br><span style="color:#E8D2A2;font-size:16px;font-weight:600">${score}/100</span></td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding-top:24px" align="center">
      <a href="${SITE_URL}/dashboard/${ctx.domainId}" style="display:inline-block;background:linear-gradient(135deg,#E8D2A2,#C8A96E,#967840);color:#060709;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;font-size:14px">Open Dashboard →</a>
    </td></tr>
    <tr><td style="padding-top:24px;font-size:11px;color:#555;text-align:center">You receive this because email alerts are enabled in DeliverWatch. 100% free, forever.</td></tr>
  </table></td></tr></table></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function plainText(ctx: AlertContext) {
  const { event, domain, score } = ctx;
  return `${SEVERITY_EMOJI[event.severity] ?? ""} [${event.severity.toUpperCase()}] ${domain} — ${event.title}\n\n${event.description}\n\nCurrent score: ${score}/100\n${SITE_URL}/dashboard/${ctx.domainId}`;
}

/* ------------------------------- senders ------------------------------- */

async function sendEmail(to: string, ctx: AlertContext) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[alerts] RESEND_API_KEY not set — skipping email to", to);
    return { ok: false, reason: "RESEND_API_KEY missing" };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const from = process.env.ALERT_FROM_EMAIL ?? "DeliverWatch <alerts@resend.dev>";
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${SEVERITY_EMOJI[ctx.event.severity] ?? ""} [${ctx.event.severity}] ${ctx.domain} — ${ctx.event.title}`,
    html: emailHtml(ctx),
    text: plainText(ctx),
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

async function sendSlack(webhookUrl: string, ctx: AlertContext) {
  const color = SEVERITY_COLOR[ctx.event.severity] ?? "#C8A96E";
  const payload = {
    text: `${SEVERITY_EMOJI[ctx.event.severity] ?? ""} *${ctx.domain}* — ${ctx.event.title}`,
    attachments: [
      {
        color,
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: `*${escapeSlack(ctx.event.title)}*\n${escapeSlack(ctx.event.description)}` } },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Domain*\n${ctx.domain}` },
              { type: "mrkdwn", text: `*Severity*\n${ctx.event.severity}` },
              { type: "mrkdwn", text: `*Score*\n${ctx.score}/100` },
            ],
          },
          {
            type: "actions",
            elements: [{ type: "button", text: { type: "plain_text", text: "Open Dashboard" }, url: `${SITE_URL}/dashboard/${ctx.domainId}` }],
          },
        ],
      },
    ],
  };
  const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return { ok: res.ok, reason: res.ok ? undefined : `Slack responded ${res.status}` };
}

function escapeSlack(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendWhatsApp(toNumber: string, ctx: AlertContext) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!sid || !token || !from) {
    console.warn("[alerts] Twilio env not set — skipping WhatsApp to", toNumber);
    return { ok: false, reason: "Twilio credentials missing" };
  }
  const to = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;
  const body = new URLSearchParams({ From: from, To: to, Body: plainText(ctx) });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return { ok: res.ok, reason: res.ok ? undefined : `Twilio responded ${res.status}` };
}

async function sendWebhook(url: string, secret: string | undefined, ctx: AlertContext) {
  const payload = JSON.stringify({
    source: "deliverwatch",
    sentAt: new Date().toISOString(),
    domain: ctx.domain,
    domainId: ctx.domainId,
    score: ctx.score,
    previousScore: ctx.previousScore ?? null,
    event: ctx.event,
    dashboardUrl: `${SITE_URL}/dashboard/${ctx.domainId}`,
  });
  const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "DeliverWatch/1.0" };
  if (secret) headers["X-DeliverWatch-Signature"] = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  const res = await fetch(url, { method: "POST", headers, body: payload });
  return { ok: res.ok, reason: res.ok ? undefined : `Webhook responded ${res.status}` };
}

/* ------------------------------ dispatcher ----------------------------- */

export interface DispatchResult {
  channelId: string;
  type: string;
  ok: boolean;
  reason?: string;
}

export async function dispatchToChannels(channels: AlertChannel[], ctx: AlertContext): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];
  for (const ch of channels) {
    if (!ch.isActive) continue;
    const cfg = (ch.config ?? {}) as Record<string, string | undefined>;
    try {
      let r: { ok: boolean; reason?: string };
      switch (ch.type) {
        case "email":
          r = cfg.email ? await sendEmail(cfg.email, ctx) : { ok: false, reason: "No email configured" };
          break;
        case "slack":
          r = cfg.webhookUrl ? await sendSlack(cfg.webhookUrl, ctx) : { ok: false, reason: "No webhook URL configured" };
          break;
        case "whatsapp":
          r = cfg.phone ? await sendWhatsApp(cfg.phone, ctx) : { ok: false, reason: "No phone configured" };
          break;
        case "webhook":
          r = cfg.url ? await sendWebhook(cfg.url, cfg.secret, ctx) : { ok: false, reason: "No URL configured" };
          break;
        default:
          r = { ok: false, reason: `Unknown channel type ${ch.type}` };
      }
      results.push({ channelId: ch.id, type: ch.type, ...r });
    } catch (err) {
      results.push({ channelId: ch.id, type: ch.type, ok: false, reason: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return results;
}

/**
 * Load a user's active channels and dispatch an alert for a warning/critical event.
 */
export async function sendAlertsForUser(userId: string, ctx: AlertContext): Promise<DispatchResult[]> {
  if (ctx.event.severity === "info") return [];
  if (!allow(userId)) {
    console.warn(`[alerts] rate limit reached for user ${userId}`);
    return [];
  }
  const channels = await db
    .select()
    .from(alertChannels)
    .where(and(eq(alertChannels.userId, userId), eq(alertChannels.isActive, true)));
  if (channels.length === 0) return [];
  return dispatchToChannels(channels, ctx);
}
