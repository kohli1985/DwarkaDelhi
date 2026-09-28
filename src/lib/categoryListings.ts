// Shared "which listings match these filters" query — used both for the
// server-rendered initial result set (src/app/category/[slug]/page.tsx,
// src/app/category/[slug]/sector/[id]/page.tsx) and mirrored by
// CategoryListings.tsx's client-side refetch on filter/sort change. Kept
// as a single function so the two never drift out of sync on ordering or
// which published/is_published filter applies.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Listing } from "@/lib/supabase/types";

export async function getCategoryListings(
  supabase: SupabaseClient,
  {
    categoryIds,
    sectorIds,
    sortDir = "asc",
  }: {
    categoryIds: string[];
    sectorIds?: number[];
    sortDir?: "asc" | "desc";
  },
): Promise<Listing[]> {
  if (categoryIds.length === 0) return [];

  let query = supabase
    .from("listings")
    .select("*")
    .in("category_id", categoryIds)
    .eq("is_published", true);

  if (sectorIds && sectorIds.length > 0) {
    query = query.in("sector", sectorIds);
  }

  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("name", { ascending: sortDir === "asc" });

  if (error) throw new Error(error.message);
  return (data ?? []) as Listing[];
}
