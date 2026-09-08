import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  try {
    const [user] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    if (!user) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.passwordHash) {
      return Response.json({ error: "This account signs in with Google. Please click 'Continue with Google'." }, { status: 400 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);

    return Response.json({ user: { id: user.id, email: user.email, fullName: user.fullName, plan: user.plan } });
  } catch (err) {
    console.error("[login] Database operation failed:", err);
    return Response.json({ error: "Database connection failed. Please verify your DATABASE_URL in .env.local." }, { status: 500 });
  }
}
