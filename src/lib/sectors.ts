// Single source of truth for "which sectors does the public site show" —
// the home page, /category/[slug], /sector/[id] and the sitemap all need
// this same list (for the sector chips, filters, and "Browse by sector"
// nav), and previously each page ran its own `.eq("is_active", true)`
// query. Routing them all through this one function means there's only
// one place that decides.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sector } from "@/lib/supabase/types";

export async function getActiveSectors(
  supabase: SupabaseClient,
): Promise<Sector[]> {
  // Explicit is_active filter, not just RLS — if the person viewing the
  // public site happens to be signed in as the admin (same browser/
  // cookies), the "authenticated users manage sectors" RLS policy would
  // otherwise let this query see inactive sectors too.
  const [{ data: sectors, error: sectorsError }, { data: listingSectors, error: listingsError }] =
    await Promise.all([
      supabase.from("sectors").select("*").eq("is_active", true),
      // Only need which sectors have at least one published listing, not
      // the listings themselves — a sector with zero listings is dead
      // weight in the nav (nothing to actually show once you tap it), so
      // it's filtered out here rather than on every page that calls this.
      supabase.from("listings").select("sector").eq("is_published", true),
    ]);
  if (sectorsError) throw new Error(sectorsError.message);
  if (listingsError) throw new Error(listingsError.message);

  const sectorsWithListings = new Set(
    ((listingSectors ?? []) as { sector: number }[]).map((l) => l.sector),
  );
  return ((sectors ?? []) as Sector[]).filter((s) => sectorsWithListings.has(s.id));
}
