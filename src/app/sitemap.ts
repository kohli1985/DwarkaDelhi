import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveSectors } from "@/lib/sectors";
import { SITE_URL } from "@/lib/site";

// Covers the home page, every top-level category page, every active
// sector page, every non-empty category×sector combination, and every
// published listing with a slug. Rebuilt on each request (this route is
// server-rendered like the rest of the public site — see the comment atop
// src/app/listing/[slug]/page.tsx), so it always reflects what's actually
// live right now rather than a stale build-time snapshot.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: categories }, sectors, { data: listings }] = await Promise.all([
    supabase.from("categories").select("id, slug, level, parent_id"),
    // Reuses the same "active AND has at least one listing" filter as the
    // sector nav (src/lib/sectors.ts) — an empty sector's page now 404s
    // (see src/app/sector/[id]/page.tsx), so it has no business being in
    // the sitemap either.
    getActiveSectors(supabase),
    supabase
      .from("listings")
      .select("slug, updated_at, category_id, sector")
      .eq("is_published", true)
      .not("slug", "is", null),
  ]);

  const allCategories = (categories as { id: string; slug: string; level: 1 | 2; parent_id: string | null }[]) ?? [];
  const l1Categories = allCategories.filter((c) => c.level === 1);
  const l1ById = new Map(l1Categories.map((c) => [c.id, c]));
  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const activeSectorIds = new Set(sectors.map((s) => s.id));

  const listingRows =
    (listings as { slug: string; updated_at: string; category_id: string; sector: number }[] | null) ?? [];

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = l1Categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const sectorEntries: MetadataRoute.Sitemap = sectors.map((s) => ({
    url: `${SITE_URL}/sector/${s.id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // A category×sector combo is only included once it's actually non-empty
  // (matches the 404 in src/app/category/[slug]/sector/[id]/page.tsx) —
  // derived from the listings themselves rather than a separate count
  // query, walking each listing's leaf (L2) category up to its L1 parent.
  const comboSlugsSeen = new Set<string>();
  const comboEntries: MetadataRoute.Sitemap = [];
  for (const row of listingRows) {
    if (!activeSectorIds.has(row.sector)) continue;
    const leaf = categoryById.get(row.category_id);
    const l1 = leaf?.parent_id ? l1ById.get(leaf.parent_id) : undefined;
    if (!l1) continue;
    const key = `${l1.slug}/${row.sector}`;
    if (comboSlugsSeen.has(key)) continue;
    comboSlugsSeen.add(key);
    comboEntries.push({
      url: `${SITE_URL}/category/${l1.slug}/sector/${row.sector}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const listingEntries: MetadataRoute.Sitemap = listingRows.map((l) => ({
    url: `${SITE_URL}/listing/${l.slug}`,
    lastModified: l.updated_at,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...sectorEntries,
    ...comboEntries,
    ...listingEntries,
  ];
}
