import { db } from "@/db";
import { sql } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
  try { await db.execute(sql`select 1`); return Response.json({ ok: true }); }
  catch { return Response.json({ ok: false, error: "Database unavailable" }, { status: 503 }); }

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
