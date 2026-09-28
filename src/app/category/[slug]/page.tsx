import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryListings from "@/components/CategoryListings";
import { createClient } from "@/lib/supabase/server";
import { getActiveSectors } from "@/lib/sectors";
import { getCategoryListings } from "@/lib/categoryListings";
import type { Category, Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbJsonLd } from "@/lib/jsonld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("level", 1)
    .maybeSingle();
  if (!category) return {};

  const name = (category as Category).name;
  const title = `${name} in Dwarka, Delhi | DelhiDwarka`;
  const description = `Find trusted ${name.toLowerCase()} in Dwarka, Delhi — browse listings by sector, with phone numbers, addresses and directions.`;
  const canonical = `${SITE_URL}/category/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "DelhiDwarka" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sector?: string; sub?: string }>;
}) {
  const { slug } = await params;
  const { sector, sub } = await searchParams;
  const supabase = await createClient();

  const [{ data: category }, sectorsData] = await Promise.all([
    supabase.from("categories").select("*").eq("slug", slug).eq("level", 1).maybeSingle(),
    getActiveSectors(supabase),
  ]);

  if (!category) notFound();
  const topCategory = category as Category;

  const { data: subcategoriesData } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", topCategory.id)
    .order("sort_order");
  const subcategories = (subcategoriesData as Category[]) ?? [];
  const subcategoryIds = subcategories.map((c) => c.id);

  const parsedSector = sector ? Number(sector) : null;
  const initialSectorId = parsedSector !== null && Number.isInteger(parsedSector) ? parsedSector : null;

  // Canonicalize the old ?sector=<id> query-string filter to the clean,
  // indexable /category/[slug]/sector/[id] route — but only when that's
  // unambiguous (a single sector, no subcategory filter also in play) and
  // the combination actually has at least one listing; otherwise a
  // permanent redirect would send a working filtered view (or a bookmark)
  // to what might be a 404 on the combo page.
  if (initialSectorId !== null && !sub) {
    const comboListings = await getCategoryListings(supabase, {
      categoryIds: subcategoryIds,
      sectorIds: [initialSectorId],
    });
    if (comboListings.length > 0) {
      redirect(`/category/${slug}/sector/${initialSectorId}`);
    }
  }

  const initialListings = await getCategoryListings(supabase, {
    categoryIds: sub ? [sub] : subcategoryIds,
    sectorIds: initialSectorId !== null ? [initialSectorId] : undefined,
    sortDir: "asc",
  });

  const breadcrumbItems = [{ name: "Home", href: "/" }, { name: topCategory.name }];

  const itemListJsonLd =
    initialListings.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: initialListings.map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: l.slug ? `${SITE_URL}/listing/${l.slug}` : undefined,
            name: l.name,
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(breadcrumbItems)) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        <CategoryListings
          category={topCategory}
          subcategories={subcategories}
          sectors={sortSectors((sectorsData as Sector[]) ?? [])}
          initialSectorId={initialSectorId}
          initialSubId={sub ?? null}
          initialListings={initialListings}
        />
      </main>
      <Footer />
    </>
  );
}
