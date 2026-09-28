import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryListings from "@/components/CategoryListings";
import { createClient } from "@/lib/supabase/server";
import { getCategoryListings } from "@/lib/categoryListings";
import type { Category, Sector } from "@/lib/supabase/types";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbJsonLd } from "@/lib/jsonld";

// A category pinned to one sector, e.g. /category/healthcare/sector/12 —
// the clean, indexable version of the old /category/healthcare?sector=12
// query-string filter (see the redirect in the plain category page). 404s
// for a nonexistent category/sector, an inactive sector, or a combination
// with zero listings — nothing links to (or should index) an empty page.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const sectorId = Number(id);
  if (!Number.isInteger(sectorId)) return {};

  const supabase = await createClient();
  const [{ data: category }, { data: sector }] = await Promise.all([
    supabase.from("categories").select("*").eq("slug", slug).eq("level", 1).maybeSingle(),
    supabase.from("sectors").select("*").eq("id", sectorId).maybeSingle(),
  ]);
  if (!category || !sector) return {};

  const categoryName = (category as Category).name;
  const sectorName = (sector as Sector).name;
  const title = `${categoryName} in Dwarka Sector ${sectorId} | DelhiDwarka`;
  const description = `${categoryName} in Dwarka ${sectorName} — browse listings with phone numbers, addresses and directions on DelhiDwarka.`;
  const canonical = `${SITE_URL}/category/${slug}/sector/${sectorId}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "DelhiDwarka" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategorySectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ sub?: string }>;
}) {
  const { slug, id } = await params;
  const { sub } = await searchParams;
  const sectorId = Number(id);
  if (!Number.isInteger(sectorId)) notFound();

  const supabase = await createClient();
  const [{ data: category }, { data: sector }] = await Promise.all([
    supabase.from("categories").select("*").eq("slug", slug).eq("level", 1).maybeSingle(),
    supabase.from("sectors").select("*").eq("id", sectorId).maybeSingle(),
  ]);

  // Not found for a nonexistent category/sector, or a sector that's been
  // switched off — same "hidden means hidden, not just unlisted" rule as
  // /sector/[id].
  if (!category || !sector || !(sector as Sector).is_active) notFound();
  const topCategory = category as Category;
  const sectorRow = sector as Sector;

  const { data: subcategoriesData } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", topCategory.id)
    .order("sort_order");
  const subcategories = (subcategoriesData as Category[]) ?? [];
  const subcategoryIds = subcategories.map((c) => c.id);

  const initialListings = await getCategoryListings(supabase, {
    categoryIds: sub ? [sub] : subcategoryIds,
    sectorIds: [sectorId],
    sortDir: "asc",
  });

  // Nothing to show and nothing that should be indexed — this combination
  // is excluded from the sitemap (src/app/sitemap.ts) for the same reason.
  if (initialListings.length === 0) notFound();

  const sectorName = sectorRow.name;
  const intro = `${initialListings.length} ${topCategory.name.toLowerCase()} listing${
    initialListings.length === 1 ? "" : "s"
  } in ${sectorName}.`;

  const breadcrumbItems = [
    { name: "Home", href: "/" },
    { name: topCategory.name, href: `/category/${slug}` },
    { name: sectorName },
  ];

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: initialListings.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: l.slug ? `${SITE_URL}/listing/${l.slug}` : undefined,
      name: l.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(breadcrumbItems)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        <CategoryListings
          category={topCategory}
          subcategories={subcategories}
          sectors={[]}
          initialSectorId={sectorId}
          initialSubId={sub ?? null}
          initialListings={initialListings}
          lockedSectorId={sectorId}
          heading={{ title: `${topCategory.name} in Dwarka ${sectorName}`, intro }}
        />
      </main>
      <Footer />
    </>
  );
}
