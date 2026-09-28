import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

// Covers the home page, every top-level category page, every active
// sector page, and every published listing with a slug. Rebuilt on each
// request (this route is server-rendered like the rest of the public
// site — see the comment atop src/app/listing/[slug]/page.tsx), so it
// always reflects what's actually live right now rather than a stale
// build-time snapshot.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: categories }, { data: sectors }, { data: listings }] = await Promise.all([
    supabase.from("categories").select("slug, level").eq("level", 1),
    supabase.from("sectors").select("id").eq("is_active", true),
    supabase
      .from("listings")
      .select("slug, updated_at")
      .eq("is_published", true)
      .not("slug", "is", null),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = (
    (categories as { slug: string }[] | null) ?? []
  ).map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const sectorEntries: MetadataRoute.Sitemap = ((sectors as { id: number }[] | null) ?? []).map(
    (s) => ({
      url: `${SITE_URL}/sector/${s.id}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const listingEntries: MetadataRoute.Sitemap = (
    (listings as { slug: string; updated_at: string }[] | null) ?? []
  ).map((l) => ({
    url: `${SITE_URL}/listing/${l.slug}`,
    lastModified: l.updated_at,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...categoryEntries, ...sectorEntries, ...listingEntries];
}
