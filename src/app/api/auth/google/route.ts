import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const errorUrl = new URL("/login", req.nextUrl.origin);
    errorUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(errorUrl);
  }

  const next = req.nextUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // Generate cryptographically random state to prevent CSRF attacks
  const state = randomBytes(24).toString("hex");

  const rawUrl = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).trim();
  const siteUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
  const redirectUri = new URL("/api/auth/google/callback", siteUrl).toString();

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(googleAuthUrl);
  res.cookies.set("dw_oauth_state", JSON.stringify({ state, next: safeNext }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return res;
}
