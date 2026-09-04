import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertChannels } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { dispatchToChannels } from "@/lib/alert-sender";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PATCH /api/alerts/[id] — toggle active. */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  let body: { isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.isActive !== "boolean") return Response.json({ error: "isActive must be boolean" }, { status: 400 });

  const [updated] = await db
    .update(alertChannels)
    .set({ isActive: body.isActive })
    .where(and(eq(alertChannels.id, id), eq(alertChannels.userId, user.id)))
    .returning();
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ channel: updated });
}

/** DELETE /api/alerts/[id] */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const deleted = await db
    .delete(alertChannels)
    .where(and(eq(alertChannels.id, id), eq(alertChannels.userId, user.id)))
    .returning({ id: alertChannels.id });
  if (!deleted.length) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}

/** POST /api/alerts/[id] — send a test alert through this channel. */
export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const [channel] = await db
    .select()
    .from(alertChannels)
    .where(and(eq(alertChannels.id, id), eq(alertChannels.userId, user.id)))
    .limit(1);
  if (!channel) return Response.json({ error: "Not found" }, { status: 404 });

  const [result] = await dispatchToChannels([{ ...channel, isActive: true }], {
    domain: "example.com",
    domainId: "test",
    score: 72,
    previousScore: 91,
    event: {
      type: "test_alert",
      severity: "warning",
      title: "Test alert from DeliverWatch",
      description: "If you can read this, your alert channel is configured correctly.",
    },
  });

  return Response.json({ result });
}
