// Deterministic, human-readable slug for a listing's detail page URL
// (/listing/[slug]) — built from the listing's name and sector, e.g.
// "Clove Dental Clinic" in Sector 10 -> "clove-dental-clinic-sector-10".
//
// Generated once, at creation (see createListing/bulkCreateListings in
// src/app/admin/actions.ts), and kept stable afterwards even if the name
// or sector is later edited — regenerating it on every edit would break
// every link/bookmark and anything Google has already indexed, which
// matters more here than keeping the slug perfectly in sync with the
// current name.
import type { SupabaseClient } from "@supabase/supabase-js";

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildListingSlugBase(name: string, sector: number): string {
  const base = slugifyName(name);
  return `${base || "listing"}-sector-${sector}`;
}

// Appends -2, -3, ... until a slug is free, checking both the DB (existing
// listings) and `reserved` (slugs already claimed earlier in the same call
// — e.g. two rows in the same CSV bulk-upload batch — which the DB won't
// know about yet since bulkCreateListings inserts everything in one call
// at the end).
export async function reserveUniqueListingSlug(
  supabase: SupabaseClient,
  base: string,
  reserved: Set<string>,
): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (reserved.has(candidate) || (await slugTaken(supabase, candidate))) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  reserved.add(candidate);
  return candidate;
}

async function slugTaken(supabase: SupabaseClient, slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
