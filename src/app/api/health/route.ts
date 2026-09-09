import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbError: string | null = null;
  try {
    await db.execute(sql`select 1`);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return Response.json({
    ok: dbError === null,
    dbError,
    hasDbUrl: Boolean(process.env.DATABASE_URL),
    hasGoogleId: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleIdLen: (process.env.GOOGLE_CLIENT_ID ?? "").length,
    hasGoogleSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    env: process.env.NODE_ENV,
  });
}
