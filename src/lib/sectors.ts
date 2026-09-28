// Single source of truth for "which sectors does the public site show" —
// the home page, /category/[slug], and /sector/[id] all need this same
// list (for the sector chips, filters, and "Browse by sector" nav), and
// previously each page ran its own `.eq("is_active", true)` query. Three
// copies of the same filter is exactly how a sector can end up visible on
// one page but missing from another; routing them all through this one
// function means there's only one place that decides.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sector } from "@/lib/supabase/types";

export async function getActiveSectors(
  supabase: SupabaseClient,
): Promise<Sector[]> {
  // Explicit is_active filter, not just RLS — if the person viewing the
  // public site happens to be signed in as the admin (same browser/
  // cookies), the "authenticated users manage sectors" RLS policy would
  // otherwise let this query see inactive sectors too.
  const { data, error } = await supabase
    .from("sectors")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Sector[];
}
