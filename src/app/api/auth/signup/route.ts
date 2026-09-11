import { sendVerification } from "@/lib/email-verification";
import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { readObject } from "@/lib/request";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
  const body = await readObject(req);
  if (body instanceof Response) return body;

  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = (typeof body.fullName === "string" ? body.fullName : "").trim() || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  if (email.length > 254 || password.length > 256 || (fullName?.length ?? 0) > 100) return Response.json({ error: "One or more fields are too long." }, { status: 400 });

  const limited = await rateLimit("signup", requestIdentity(req), 5);
  if (limited) return limited;

  try {
    const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1);
    if (existing.length) return Response.json({ error: "An account with that email already exists. Sign in instead." }, { status: 409 });

    const [user] = await db
      .insert(profiles)
      .values({ email, fullName, passwordHash: await hashPassword(password), plan: "community" })
      .onConflictDoNothing()
      .returning({ id: profiles.id, email: profiles.email, fullName: profiles.fullName, plan: profiles.plan });

    if (!user) return Response.json({ error: "An account with that email already exists." }, { status: 409 });
    try { await sendVerification(user); }
    catch { return Response.json({ verificationRequired: true, message: "Account created, but verification email could not be sent. Use Resend verification to try again." }); }
    return Response.json({ verificationRequired: true, message: "Check your inbox to verify your email, then sign in." });
  } catch (err) {
    console.error("[signup] Database operation failed:", err);
    return Response.json({ error: "Account creation is temporarily unavailable. Please try again." }, { status: 500 });
  }

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
