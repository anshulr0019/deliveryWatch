import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createSession, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const loginRedirect = (errorCode: string) => {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", errorCode);
    return NextResponse.redirect(dest);
  };

  if (error) {
    console.warn("[google-auth] Error returned from Google OAuth:", error);
    return loginRedirect(error === "access_denied" ? "oauth_cancelled" : "google_auth_failed");
  }

  if (!code || !state) {
    return loginRedirect("invalid_oauth_response");
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("dw_oauth_state")?.value;
  cookieStore.set("dw_oauth_state", "", { path: "/", maxAge: 0 });

  if (!stateCookie) {
    return loginRedirect("state_missing");
  }

  let savedState: string;
  let nextUrl = "/dashboard";
  try {
    const parsed = JSON.parse(stateCookie);
    savedState = parsed.state;
    if (parsed.next && typeof parsed.next === "string" && parsed.next.startsWith("/") && !parsed.next.startsWith("//")) {
      nextUrl = parsed.next;
    }
  } catch {
    return loginRedirect("state_invalid");
  }

  if (savedState !== state) {
    return loginRedirect("state_mismatch");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[google-auth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment");
    return loginRedirect("google_not_configured");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const redirectUri = new URL("/api/auth/google/callback", siteUrl).toString();

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[google-auth] Token exchange failed:", tokenRes.status, errBody);
      return loginRedirect("token_exchange_failed");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return loginRedirect("missing_access_token");
    }

    // 2. Fetch user profile from Google OpenID userinfo endpoint
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error("[google-auth] Fetching userinfo failed:", userRes.status);
      return loginRedirect("userinfo_failed");
    }

    const userInfo: GoogleUserInfo = await userRes.json();
    if (!userInfo.sub || !userInfo.email) {
      return loginRedirect("incomplete_google_profile");
    }

    const email = userInfo.email.trim().toLowerCase();
    const fullName = userInfo.name?.trim() || null;
    const avatarUrl = userInfo.picture || null;
    const googleId = userInfo.sub;

    // 3. User Resolution / Provisioning in PostgreSQL
    let [user] = await db.select().from(profiles).where(eq(profiles.googleId, googleId)).limit(1);

    if (!user) {
      const [existingByEmail] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);

      if (existingByEmail) {
        // Link Google ID to the existing account
        const [updated] = await db
          .update(profiles)
          .set({
            googleId,
            avatarUrl: existingByEmail.avatarUrl ?? avatarUrl,
            fullName: existingByEmail.fullName ?? fullName,
          })
          .where(eq(profiles.id, existingByEmail.id))
          .returning();
        user = updated;
      } else {
        // Create new account
        const [created] = await db
          .insert(profiles)
          .values({
            email,
            fullName,
            googleId,
            avatarUrl,
            plan: "community",
          })
          .returning();
        user = created;
      }
    }

    // 4. Create first-party session and set session cookie
    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);

    const destination = new URL(nextUrl, siteUrl);
    return NextResponse.redirect(destination);
  } catch (err) {
    console.error("[google-auth] Unexpected error during OAuth callback:", err);
    return loginRedirect("oauth_internal_error");
  }
}
