import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchExperience from "@/components/SearchExperience";
import SectorCircles from "@/components/SectorCircles";
import CategoryGrid from "@/components/CategoryGrid";
import { createClient } from "@/lib/supabase/server";
import type { Category, Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";

export default async function SectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sectorId = Number(id);
  if (!Number.isInteger(sectorId)) notFound();

  const supabase = await createClient();

  const [{ data: sector }, { data: sectorsData }, { data: listingCatRows }, { data: allCategories }] =
    await Promise.all([
      supabase.from("sectors").select("*").eq("id", sectorId).maybeSingle(),
      // Explicit is_active filter, not just RLS — see the comment in
      // src/app/page.tsx for why this matters when the viewer is signed in.
      supabase.from("sectors").select("*").eq("is_active", true),
      supabase.from("listings").select("category_id").eq("sector", sectorId).eq("is_published", true),
      supabase.from("categories").select("*"),
    ]);

  // Not found for a nonexistent sector, and also for one that's been
  // switched off — a hidden sector shouldn't be browsable via a direct link
  // either, matching "visible on site" meaning fully hidden, not just
  // unlisted.
  if (!sector || !(sector as Sector).is_active) notFound();
  const sectorRow = sector as Sector;

  // Listings only ever store a leaf (L2) category — walk each one up to its
  // L1 parent so the tile grid shows top-level categories (same as the
  // homepage), but only the ones actually represented in this sector.
  const categoriesList = (allCategories as Category[]) ?? [];
  const categoryById = new Map(categoriesList.map((c) => [c.id, c]));

  const l1Ids = new Set<string>();
  for (const row of (listingCatRows as { category_id: string }[]) ?? []) {
    const l2 = categoryById.get(row.category_id);
    if (l2?.parent_id) l1Ids.add(l2.parent_id);
  }
  const applicableCategories = categoriesList.filter((c) => l1Ids.has(c.id));

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="bg-background pb-2 pt-12 sm:pt-16">
          <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
            <span className="text-sm font-semibold uppercase tracking-wide text-brand">
              Sector
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {sectorRow.name}
            </h1>
          </div>
        </section>

        <SearchExperience sectorId={sectorId} sectorName={sectorRow.name} />
        <SectorCircles
          sectors={sortSectors((sectorsData as Sector[]) ?? [])}
          activeSectorId={sectorId}
        />
        <CategoryGrid
          categories={applicableCategories}
          sectorId={sectorId}
          title={`Categories in ${sectorRow.name}`}
          description="Tap a category to browse listings in this sector."
        />
      </main>
      <Footer />
    </>
  );
}
