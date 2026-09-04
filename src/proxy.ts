import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "dw_session";
const PROTECTED_PREFIXES = ["/dashboard", "/settings"];

/**
 * Route guard (Next.js 16 `proxy`, successor of `middleware`).
 * Fast cookie-presence check at the edge; full session validation happens
 * server-side in the dashboard layout and every API route.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login"],
};
