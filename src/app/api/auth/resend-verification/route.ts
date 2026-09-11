import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { readObject } from "@/lib/request";
import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { sendVerification } from "@/lib/email-verification";
export async function POST(req: Request) {
  try {
  const body = await readObject(req); if (body instanceof Response) return body;
  if (typeof body.email !== "string" || body.email.length > 254) return Response.json({ error: "Enter your email address." }, { status: 400 });
  const email = body.email.trim().toLowerCase();
  const limited = await rateLimit("resend", requestIdentity(req), 3, 3600) ?? await rateLimit("resend-email", email, 3, 3600); if (limited) return limited;
  const [user] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
  if (user && !user.emailVerifiedAt) await sendVerification(user).catch(error => console.error("[verification] send failed", error));
  return Response.json({ message: "If this account needs verification, a new email has been requested. Check your inbox." });

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
