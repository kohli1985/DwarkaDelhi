import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/supabase/types";
import { groupCategories } from "@/lib/supabase/types";
import CategoriesManager from "./CategoriesManager";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  const groups = groupCategories((categories as Category[]) ?? []);
  const totalL2 = groups.reduce((sum, g) => sum + g.children.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {groups.length} categor{groups.length === 1 ? "y" : "ies"}, {totalL2} subcategor
            {totalL2 === 1 ? "y" : "ies"}.
          </p>
        </div>
        <Link
          href="/admin/categories/bulk"
          className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
        >
          Bulk upload
        </Link>
      </div>

      <CategoriesManager groups={groups} />
    </div>
  );
}
