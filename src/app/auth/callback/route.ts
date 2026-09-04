import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Post-auth landing. With first-party session auth the cookie is already set
 * by /api/auth/*; this route simply validates it and forwards to the right place.
 * (Kept for parity with OAuth-style flows: /auth/callback?next=/dashboard)
 */
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/dashboard";
  const user = await getCurrentUser();
  const url = req.nextUrl.clone();
  url.search = "";
  url.pathname = user ? safeNext : "/login";
  if (!user && safeNext !== "/dashboard") url.searchParams.set("next", safeNext);
  return NextResponse.redirect(url);
}
