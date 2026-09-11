import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { readObject } from "@/lib/request";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
  const body = await readObject(req);
  if (body instanceof Response) return body;

  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password || email.length > 254 || password.length > 256) return Response.json({ error: "Invalid email or password." }, { status: 400 });

  const limited = await rateLimit("login", requestIdentity(req), 10);
  if (limited) return limited;

  try {
    const [user] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    if (!user) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.passwordHash) {
      return Response.json({ error: "This account signs in with Google. Please click 'Continue with Google'." }, { status: 400 });
    }

    if (!await verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.emailVerifiedAt) return Response.json({ error: "Verify your email before signing in. Use Resend verification below." }, { status: 403 });

    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);

    return Response.json({ user: { id: user.id, email: user.email, fullName: user.fullName, plan: user.plan } });
  } catch (err) {
    console.error("[login] Database operation failed:", err);
    return Response.json({ error: "Sign-in is temporarily unavailable. Please try again." }, { status: 500 });
  }

  } catch (error) {
    console.error("[api] Request failed", error);
    return Response.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
}
