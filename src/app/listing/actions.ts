"use server";

// Logs an event on a listing — a page view (src/app/listing/[slug]/page.tsx,
// fired via next/server's after() so it never delays the response) or a
// Call/WhatsApp/Directions button click (src/components/ListingActionButtons.tsx,
// fire-and-forget, never awaited so it never delays the tel:/wa.me/maps
// navigation the click already triggered). Anonymous — no IP, no user
// agent, no identity beyond the short-lived session cookie used only to
// dedupe a rapid double-fire of the same event.
//
// Writes go through the "anyone can log a listing click event" RLS policy
// (supabase/migrations/0010_listing_click_events.sql), the same
// public-insert-only pattern as the contact form. The "view" action, and
// the source_page/session_id columns this dedupe/bot-filtering relies on,
// are added by supabase/migrations/0012_extend_listing_events.sql — until
// that migration is approved and run, inserts here fail (caught and
// logged, never thrown) rather than breaking the page or button.
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLikelyBot, SESSION_COOKIE } from "@/lib/analytics";
import type { ListingClickAction } from "@/lib/supabase/types";

const DEDUPE_WINDOW_SECONDS = 30;

export async function trackListingEvent(
  listingId: string,
  action: ListingClickAction,
  sourcePage: string,
) {
  try {
    const headerList = await headers();
    if (isLikelyBot(headerList.get("user-agent"))) return;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

    const supabase = await createClient();

    if (sessionId) {
      const since = new Date(Date.now() - DEDUPE_WINDOW_SECONDS * 1000).toISOString();
      const { data: recent } = await supabase
        .from("listing_click_events")
        .select("id")
        .eq("listing_id", listingId)
        .eq("action", action)
        .eq("session_id", sessionId)
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      if (recent) return; // same listing + action + session within the window
    }

    const { error } = await supabase
      .from("listing_click_events")
      .insert({ listing_id: listingId, action, source_page: sourcePage, session_id: sessionId });

    if (error) {
      // Expected until 0012_extend_listing_events.sql is approved and run
      // (the "view" action / source_page / session_id columns don't exist
      // yet) — best-effort, never surfaced to the visitor.
      console.error("trackListingEvent failed:", error.message);
    }
  } catch (err) {
    console.error("trackListingEvent failed:", err);
  }
}

// Back-compat name — ListingActionButtons.tsx calls this for Call/WhatsApp/
// Directions clicks specifically.
export async function trackListingClick(listingId: string, action: ListingClickAction) {
  return trackListingEvent(listingId, action, "listing_detail");
}
