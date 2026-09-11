import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { emailVerifications, profiles } from "@/db/schema";
import { readObject } from "@/lib/request";
import { verificationHash } from "@/lib/email-verification";
import { rateLimit, requestIdentity } from "@/lib/rate-limit";
export async function POST(req: Request) {
  try {
  const body = await readObject(req);
  if (body instanceof Response) return body;
  if (typeof body.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) return Response.json({ error: "Invalid verification link." }, { status: 400 });
  const limited = await rateLimit("verify", requestIdentity(req), 10); if (limited) return limited;
  const tokenHash = verificationHash(body.token);
  const verified = await db.transaction(async tx => {
    const [token] = await tx.delete(emailVerifications).where(and(eq(emailVerifications.tokenHash, tokenHash), gt(emailVerifications.expiresAt, new Date()))).returning();
    if (!token) return false;
    await tx.update(profiles).set({ emailVerifiedAt: new Date() }).where(eq(profiles.id, token.userId));
    await tx.delete(emailVerifications).where(eq(emailVerifications.userId, token.userId));
    return true;
  });
  return Response.json(verified ? { ok: true } : { error: "Link expired or already used. Request a new verification email." }, { status: verified ? 200 : 400 });

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
