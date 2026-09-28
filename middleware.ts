import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/analytics";

// Ensures every visitor has a random, anonymous session id before any page
// or server action runs — used only to dedupe a rapid double-fire of the
// same listing view/click event (src/lib/analytics.ts, src/app/listing/actions.ts).
// Not a login/auth session, carries no personal data, and isn't read by
// anything except that dedupe check.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.has(SESSION_COOKIE)) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24h — long enough to catch same-visit dedupe, short enough it isn't a persistent identifier
      path: "/",
    });
  }

  return response;
}

export const config = {
  // Skip static assets and Next internals — no point setting a cookie for
  // a JS chunk or an image request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
