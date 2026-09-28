"use server";

// Logs a click on a listing detail page's Call/WhatsApp/Directions button
// (src/components/ListingActionButtons.tsx). Anonymous, fire-and-forget —
// called directly from a client component without awaiting the result, so
// it never delays the tel:/wa.me/maps navigation the click already
// triggered. Writes go through the "anyone can log a listing click event"
// RLS policy (supabase/migrations/0010_listing_click_events.sql), the same
// public-insert-only pattern as the contact form.
import { createClient } from "@/lib/supabase/server";
import type { ListingClickAction } from "@/lib/supabase/types";

export async function trackListingClick(listingId: string, action: ListingClickAction) {
  const supabase = await createClient();
  // Best-effort — a failed click log should never surface as an error to
  // the visitor, who has already navigated away to their phone/WhatsApp app.
  const { error } = await supabase
    .from("listing_click_events")
    .insert({ listing_id: listingId, action });
  if (error) {
    console.error("trackListingClick failed:", error.message);
  }
}
