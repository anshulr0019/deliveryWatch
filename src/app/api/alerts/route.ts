import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertChannels } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TYPES = ["email", "slack", "whatsapp", "webhook"] as const;
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
    case "whatsapp": {
      const phone = String(cfg.phone ?? "").replace(/[\s()-]/g, "");
      if (!/^\+[1-9]\d{6,14}$/.test(phone)) return { ok: false, error: "Enter a WhatsApp number in E.164 format, e.g. +14155551234." };
      return { ok: true, config: { phone } };
    }
    case "webhook": {
      const url = String(cfg.url ?? "").trim();
      if (!/^https?:\/\/.+/.test(url)) return { ok: false, error: "Enter a valid webhook URL." };
      const secret = String(cfg.secret ?? "").trim();
      return { ok: true, config: secret ? { url, secret } : { url } };
    }
  }
}

/** GET /api/alerts — list alert channels. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(alertChannels).where(eq(alertChannels.userId, user.id)).orderBy(desc(alertChannels.createdAt));
  return Response.json({ channels: rows });
}

/** POST /api/alerts — create an alert channel. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: { type?: string; config?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type as ChannelType;
  if (!TYPES.includes(type)) return Response.json({ error: "Invalid channel type." }, { status: 400 });

  const v = validateConfig(type, body.config ?? {});
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  const [created] = await db.insert(alertChannels).values({ userId: user.id, type, config: v.config }).returning();
  return Response.json({ channel: created }, { status: 201 });
}
