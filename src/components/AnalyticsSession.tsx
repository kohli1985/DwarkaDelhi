"use client";

// Ensures every visitor has the anonymous analytics session cookie
// (src/lib/analytics.ts's SESSION_COOKIE) before any tracked action —
// mounted once in the root layout. This runs client-side, on document.cookie,
// rather than via Next.js middleware: a root middleware.ts hits a Next.js
// 16.3.x/Vercel build bug (the build fails to produce a required
// middleware.js.nft.json trace file — see
// https://github.com/vercel/next.js/issues/96646 for the same class of
// bug), so setting the cookie from the browser avoids that entirely while
// achieving the same thing.
//
// No PII, no auth — just a random id used only to dedupe a rapid
// double-fire of the same listing view/click event
// (src/app/listing/actions.ts) within a short window. Not httpOnly (it's
// set from JS), but nothing sensitive depends on that: it isn't a session
// token, doesn't grant access to anything, and its only reader is the
// dedupe check.
import { useEffect } from "react";
import { SESSION_COOKIE } from "@/lib/analytics";

const MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — long enough to catch same-visit dedupe

function hasSessionCookie(): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${SESSION_COOKIE}=`));
}

export default function AnalyticsSession() {
  useEffect(() => {
    if (hasSessionCookie()) return;
    const id = crypto.randomUUID();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${SESSION_COOKIE}=${id}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  }, []);

  return null;
}
