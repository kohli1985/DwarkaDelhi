import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryListings from "@/components/CategoryListings";
import { createClient } from "@/lib/supabase/server";
import type { Category, Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";

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

  const [{ data: category }, { data: sectorsData }] = await Promise.all([
    supabase.from("categories").select("*").eq("slug", slug).eq("level", 1).maybeSingle(),
    supabase.from("sectors").select("*").eq("is_active", true),
  ]);

  if (!category) notFound();
  const topCategory = category as Category;

  const { data: subcategoriesData } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", topCategory.id)
    .order("sort_order");

  const parsedSector = sector ? Number(sector) : null;
  const initialSectorId = parsedSector !== null && Number.isInteger(parsedSector) ? parsedSector : null;

  return (
    <>
      <Header />
      <main className="flex-1">
        <CategoryListings
          category={topCategory}
          subcategories={(subcategoriesData as Category[]) ?? []}
          sectors={sortSectors((sectorsData as Sector[]) ?? [])}
          initialSectorId={initialSectorId}
          initialSubId={sub ?? null}
        />
      </main>
      <Footer />
    </>
  );
}
