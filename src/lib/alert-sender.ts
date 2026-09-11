import { postWebhook } from "@/lib/safe-webhook";
import { createHmac } from "node:crypto";
import { type AlertChannel } from "@/db/schema";
import type { DetectedEvent } from "@/lib/change-detector";

export interface AlertContext {
  deliveryId?: string;
  domain: string;
  domainId: string;
  score: number;
  previousScore?: number;
  event: DetectedEvent;
}
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SEVERITY_EMOJI: Record<string, string> = { critical: "🚨", warning: "⚠️", info: "ℹ️" };
const SEVERITY_COLOR: Record<string, string> = { critical: "#F87171", warning: "#FBBF24", info: "#C8A96E" };

/* ------------------------------ templates ------------------------------ */

function emailHtml(ctx: AlertContext): string {
  const { event, domain, score } = ctx;
  const color = SEVERITY_COLOR[event.severity] ?? "#10B981";
  return `<!doctype html><html><body style="margin:0;background:#0F172A;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#F8FAFC;padding:36px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="560" style="max-width:560px;background:#1E293B;border:1px solid rgba(16,185,129,0.3);border-radius:20px;padding:32px;box-shadow:0 12px 36px rgba(0,0,0,0.3)">
    <tr><td style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#10B981;font-weight:700">DeliveryWatch Alert</td></tr>
    <tr><td style="padding-top:12px;font-size:22px;font-weight:700;color:#FFFFFF">${SEVERITY_EMOJI[event.severity] ?? ""} ${escapeHtml(event.title)}</td></tr>
    <tr><td style="padding-top:8px;font-size:14px;color:#94A3B8;line-height:1.6">${escapeHtml(event.description)}</td></tr>
    <tr><td style="padding-top:24px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:14px">
        <tr>
          <td style="padding:16px;font-size:12px;color:#94A3B8">Domain<br><span style="color:#FFFFFF;font-size:15px;font-weight:700">${escapeHtml(domain)}</span></td>
          <td style="padding:16px;font-size:12px;color:#94A3B8">Severity<br><span style="color:${color};font-size:15px;font-weight:700;text-transform:capitalize">${event.severity}</span></td>
          <td style="padding:16px;font-size:12px;color:#94A3B8">Deliverability Score<br><span style="color:#10B981;font-size:15px;font-weight:700">${score}/100</span></td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding-top:28px" align="center">
      <a href="${SITE_URL}/dashboard/${ctx.domainId}" style="display:inline-block;background:#0F372E;border:1px solid #10B981;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:999px;font-size:14px;box-shadow:0 4px 14px rgba(16,185,129,0.2)">Open Dashboard →</a>
    </td></tr>
    <tr><td style="padding-top:24px;font-size:11px;color:#64748B;text-align:center">DeliveryWatch Continuous Monitoring · 100% Free Forever</td></tr>
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
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(8000),
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", ...(ctx.deliveryId ? { "Idempotency-Key": ctx.deliveryId } : {}) },
    body: JSON.stringify({ from: process.env.ALERT_FROM_EMAIL ?? "DeliveryWatch <onboarding@resend.dev>", to: [to],
      subject: `[${ctx.event.severity}] ${ctx.domain} — ${ctx.event.title}`, html: emailHtml(ctx), text: plainText(ctx) }),
  });
  return { ok: res.ok, reason: res.ok ? undefined : `Email provider responded ${res.status}` };
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
  return postWebhook(webhookUrl, JSON.stringify(payload), { "Content-Type": "application/json" });
}

function escapeSlack(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendWebhook(url: string, secret: string | undefined, ctx: AlertContext) {
  const payload = JSON.stringify({
    source: "deliverywatch",
    sentAt: new Date().toISOString(),
    domain: ctx.domain,
    domainId: ctx.domainId,
    score: ctx.score,
    previousScore: ctx.previousScore ?? null,
    event: ctx.event,
    dashboardUrl: `${SITE_URL}/dashboard/${ctx.domainId}`,
  });
  const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "DeliveryWatch/1.0" };
  if (ctx.deliveryId) headers["X-DeliveryWatch-Delivery"] = ctx.deliveryId;
  if (secret) headers["X-DeliveryWatch-Signature"] = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  return postWebhook(url, payload, headers);
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
    // Ignore channel types from older installations that are no longer supported.
    if (ch.type !== "email" && ch.type !== "slack" && ch.type !== "webhook") continue;
    const cfg = (ch.config ?? {}) as Record<string, string | undefined>;
    try {
      let r: { ok: boolean; reason?: string } = { ok: false, reason: "Unsupported channel type" };
      switch (ch.type) {
        case "email":
          r = cfg.email ? await sendEmail(cfg.email, ctx) : { ok: false, reason: "No email configured" };
          break;
        case "slack":
          r = cfg.webhookUrl ? await sendSlack(cfg.webhookUrl, ctx) : { ok: false, reason: "No webhook URL configured" };
          break;
        case "webhook":
          r = cfg.url ? await sendWebhook(cfg.url, cfg.secret, ctx) : { ok: false, reason: "No URL configured" };
          break;
      }
      results.push({ channelId: ch.id, type: ch.type, ...r });
    } catch (err) {
      results.push({ channelId: ch.id, type: ch.type, ok: false, reason: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return results;
}
