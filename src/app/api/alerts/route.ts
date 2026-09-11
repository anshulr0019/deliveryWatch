import { rateLimit } from "@/lib/rate-limit";
import { resolveWebhook } from "@/lib/safe-webhook";
import { readObject } from "@/lib/request";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertChannels } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TYPES = ["email", "slack", "webhook"] as const;
type ChannelType = (typeof TYPES)[number];

function validateConfig(type: ChannelType, cfg: Record<string, unknown>): { ok: true; config: Record<string, string> } | { ok: false; error: string } {
  switch (type) {
    case "email": {
      const email = String(cfg.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
      return { ok: true, config: { email } };
    }
    case "slack": {
      const webhookUrl = String(cfg.webhookUrl ?? "").trim();
      if (!/^https:\/\/hooks\.slack\.com\/services\/.+/.test(webhookUrl)) return { ok: false, error: "Enter a valid Slack incoming webhook URL (https://hooks.slack.com/services/...)." };
      return { ok: true, config: { webhookUrl } };
    }
    case "webhook": {
      const url = String(cfg.url ?? "").trim();
      if (!/^https:\/\/.+/.test(url)) return { ok: false, error: "Enter a valid webhook URL." };
      const secret = String(cfg.secret ?? "").trim();
      return { ok: true, config: secret ? { url, secret } : { url } };
    }
  }
}

/** GET /api/alerts — list alert channels. */
export async function GET() {
  try {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(alertChannels).where(eq(alertChannels.userId, user.id)).orderBy(desc(alertChannels.createdAt));
  return Response.json({ channels: rows.filter((row) => TYPES.includes(row.type as ChannelType)) });

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}

/** POST /api/alerts — create an alert channel. */
export async function POST(req: Request) {
  try {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const limited = await rateLimit("alert-create", user.id, 10);
  if (limited) return limited;

  const body = await readObject(req);
  if (body instanceof Response) return body;

  const type = body.type as ChannelType;
  if (!TYPES.includes(type)) return Response.json({ error: "Invalid channel type." }, { status: 400 });

  const v = validateConfig(type, body.config && typeof body.config === "object" && !Array.isArray(body.config) ? body.config as Record<string, unknown> : {});
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  if (type === "webhook" || type === "slack") {
    try { await resolveWebhook(v.config.url ?? v.config.webhookUrl); }
    catch { return Response.json({ error: "Use a reachable public HTTPS webhook URL on port 443." }, { status: 400 }); }
  }
  const [created] = await db.insert(alertChannels).values({ userId: user.id, type, config: v.config }).returning();
  return Response.json({ channel: created }, { status: 201 });

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
