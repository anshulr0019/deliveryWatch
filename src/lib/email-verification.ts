import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailVerifications } from "@/db/schema";
export const verificationHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function sendVerification(user: { id: string; email: string }) {
  const token = randomBytes(32).toString("base64url");
  const key = process.env.RESEND_API_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!key || !site) throw new Error("Email verification is not configured.");
  await db.insert(emailVerifications).values({ userId: user.id, tokenHash: verificationHash(token), expiresAt: new Date(Date.now() + 3600000) });
  const url = new URL("/verify-email", site); url.searchParams.set("token", token);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.ALERT_FROM_EMAIL ?? "DeliveryWatch <onboarding@resend.dev>", to: [user.email], subject: "Verify your DeliveryWatch email", text: `Confirm your email address to sign in to DeliveryWatch. This link expires in one hour:\n\n${url}\n\nIf you did not request this account, ignore this email.` }),
    });
    if (!response.ok) throw new Error("Verification email could not be sent.");
  } catch (error) {
    await db.delete(emailVerifications).where(eq(emailVerifications.tokenHash, verificationHash(token)));
    throw error;
  }
}
