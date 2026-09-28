// Shared fetch for a single listing's detail page (/listing/[slug]) —
// wrapped in React's cache() so generateMetadata and the page component
// (both of which need the same listing) share one DB round trip per
// request instead of two.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Category, Listing, Sector } from "@/lib/supabase/types";

export type ListingWithRelations = Listing & {
  // The listing's own (leaf/L2) subcategory — used as the display label.
  category: Category | null;
  // Its L1 parent — /category/[slug] only ever matches a top-level (L1)
  // slug (see src/app/category/[slug]/page.tsx), so links to "the category
  // page" have to use this, not `category.slug`.
  topCategory: Category | null;
  sectorInfo: Sector | null;
};

// Gated only on is_published (the same "published listings are publicly
// readable" RLS policy every other public page relies on) — deliberately
// NOT on the listing's sector being is_active. A sector can be toggled
// hidden from browsing/search (see src/lib/sectors.ts) without making
// every listing in it unreachable by direct/indexed link, which is the
// whole point of this page existing.
export const getListingBySlug = cache(
  async (slug: string): Promise<ListingWithRelations | null> => {
    const supabase = await createClient();
    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!listing) return null;
    const row = listing as Listing;

    const [{ data: category }, { data: sectorInfo }] = await Promise.all([
      supabase.from("categories").select("*").eq("id", row.category_id).maybeSingle(),
      supabase.from("sectors").select("*").eq("id", row.sector).maybeSingle(),
    ]);
    const categoryRow = (category as Category) ?? null;

    const { data: topCategory } = categoryRow?.parent_id
      ? await supabase.from("categories").select("*").eq("id", categoryRow.parent_id).maybeSingle()
      : { data: null };

    return {
      ...row,
      category: categoryRow,
      topCategory: (topCategory as Category) ?? null,
      sectorInfo: (sectorInfo as Sector) ?? null,
    };
  },
);
