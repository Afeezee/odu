import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

/**
 * Route protection:
 *   /chat  — any signed-in user
 *   /admin — role === 'admin'
 * Signed-out visitors are redirected to /sign-in?next=<original path>.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  if (pathname.startsWith("/admin")) {
    if (!session) return redirectToSignIn(req, "/admin");
    if (session.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/chat";
      url.searchParams.set("noadmin", "1");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/chat")) {
    if (!session) return redirectToSignIn(req, pathname);
    return NextResponse.next();
  }

  // If a signed-in user visits /sign-in or /sign-up, send them to /chat.
  if ((pathname === "/sign-in" || pathname === "/sign-up") && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function redirectToSignIn(req: NextRequest, next: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/chat/:path*", "/admin/:path*", "/sign-in", "/sign-up"],
};
