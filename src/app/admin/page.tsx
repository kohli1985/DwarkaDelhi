import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Category, Listing, Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";
import ListingsTable from "./ListingsTable";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ data: listings }, { data: categories }, { data: sectorsData }] = await Promise.all([
    supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*"),
    supabase.from("sectors").select("*"),
  ]);

  const categoryList = (categories as Category[]) ?? [];
  const categoryById = new Map(categoryList.map((c) => [c.id, c]));

  // "L1 > L2" display string for each subcategory, e.g. "Food & Dining > Cafes".
  const categoryPathById = new Map<string, string>();
  for (const c of categoryList) {
    if (c.level === 2 && c.parent_id) {
      const parent = categoryById.get(c.parent_id);
      categoryPathById.set(c.id, parent ? `${parent.name} > ${c.name}` : c.name);
    }
  }

  const sectors = sortSectors((sectorsData as Sector[]) ?? []);
  const sectorSummary =
    sectors.length > 0 ? `sector${sectors.length === 1 ? "" : "s"} ${sectors.map((s) => s.id).join(", ")}` : "no sectors yet";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Listings</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {listings?.length ?? 0} total across {sectorSummary}.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/listings/bulk"
            className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            Bulk upload
          </Link>
          <Link
            href="/admin/listings/new"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            + New listing
          </Link>
        </div>
      </div>

      <ListingsTable
        listings={(listings as Listing[]) ?? []}
        categoryPathById={Object.fromEntries(categoryPathById)}
      />
    </div>
  );
}
