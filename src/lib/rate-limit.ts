import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export function requestIdentity(req: Request): string {
  // Only trust forwarded addresses when the deployment controls/replaces that header.
  const ip = process.env.VERCEL === "1" ? req.headers.get("x-vercel-forwarded-for") :
    process.env.TRUST_PROXY === "true" ? req.headers.get("x-forwarded-for") : null;
  return ip?.split(",")[0]?.trim() || "shared";
}

export async function rateLimit(scope: string, identity: string, limit: number, seconds = 60): Promise<Response | null> {
  const key = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limits (key, count, expires_at)
      VALUES (${key}, 1, now() + ${seconds} * interval '1 second')
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.expires_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
        expires_at = CASE WHEN rate_limits.expires_at <= now() THEN now() + ${seconds} * interval '1 second' ELSE rate_limits.expires_at END
      WHERE rate_limits.expires_at <= now() OR rate_limits.count < ${limit}
      RETURNING count`);
    if (!result.rows.length) return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(seconds) } });
    return null;
  } catch {
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
