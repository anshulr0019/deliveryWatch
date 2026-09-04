import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { checks, domains, events } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/domains/[id] — domain + full check history + events timeline. */
export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const [domain] = await db
    .select()
    .from(domains)
    .where(and(eq(domains.id, id), eq(domains.userId, user.id)))
    .limit(1);
  if (!domain) return Response.json({ error: "Not found" }, { status: 404 });

  const [history, timeline] = await Promise.all([
    db.select().from(checks).where(eq(checks.domainId, id)).orderBy(desc(checks.checkedAt)).limit(500),
    db.select().from(events).where(eq(events.domainId, id)).orderBy(desc(events.createdAt)).limit(200),
  ]);

  return Response.json({ domain, checks: history, events: timeline });
}

/** DELETE /api/domains/[id] — stop monitoring and remove all history. */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const deleted = await db
    .delete(domains)
    .where(and(eq(domains.id, id), eq(domains.userId, user.id)))
    .returning({ id: domains.id });

  if (!deleted.length) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}

/** PATCH /api/domains/[id] — pause / resume monitoring. */
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
    .update(domains)
    .set({ isActive: body.isActive })
    .where(and(eq(domains.id, id), eq(domains.userId, user.id)))
    .returning();

  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ domain: updated });
}
