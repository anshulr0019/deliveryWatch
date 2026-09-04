import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { domains } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/domains — all monitored domains for the current user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const rows = await db.select().from(domains).where(eq(domains.userId, user.id)).orderBy(desc(domains.createdAt));

  return Response.json({
    domains: rows.map((d) => ({
      id: d.id,
      domain: d.domain,
      isActive: d.isActive,
      latestScore: d.latestScore,
      lastCheckedAt: d.lastCheckedAt,
      createdAt: d.createdAt,
    })),
  });
}
