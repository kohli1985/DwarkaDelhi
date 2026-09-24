"use server";

// Server Actions for admin category management. Same auth model as
// src/app/admin/actions.ts — runs under the signed-in admin's session, so
// writes go through the "authenticated users manage categories" RLS policy.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/supabase/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const level = Number(formData.get("level")) === 2 ? 2 : 1;
  const parentId = (formData.get("parent_id") as string) || null;
  const emoji = (formData.get("emoji") as string) || null;

  if (!name) throw new Error("Name is required");
  if (level === 2 && !parentId) throw new Error("A subcategory needs a parent category");

  const supabase = await createClient();

  let slug = slugify(name);
  if (level === 2 && parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", parentId)
      .single();
    if (parent) slug = `${(parent as { slug: string }).slug}-${slug}`;
  }

  let sortQuery = supabase.from("categories").select("sort_order").eq("level", level);
  sortQuery = level === 2 ? sortQuery.eq("parent_id", parentId!) : sortQuery.is("parent_id", null);
  const { data: maxSort } = await sortQuery
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    level,
    parent_id: level === 2 ? parentId : null,
    emoji: level === 1 ? emoji : null,
    sort_order: ((maxSort as { sort_order: number } | null)?.sort_order ?? 0) + 1,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/listings/new");
}

export type CategoryBulkRow = {
  category: string; // L1 name
  subcategory?: string; // L2 name — blank/omitted means "just ensure this L1 exists"
  emoji?: string; // only applied when the L1 is newly created
};

export type CategoryBulkResult = {
  createdL1: number;
  createdL2: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

// Upserts categories from parsed CSV rows — reuses the same category/
// subcategory shape as the original taxonomy CSV, so the admin can re-upload
// that file (or an extended version of it) at any time to add new
// categories without hand-writing SQL. Existing categories are left
// untouched (name/emoji not overwritten) — this only ever adds.
export async function bulkCreateCategories(
  rows: CategoryBulkRow[],
): Promise<CategoryBulkResult> {
  const supabase = await createClient();
  const { data: existingData, error: fetchError } = await supabase
    .from("categories")
    .select("*");
  if (fetchError) throw new Error(fetchError.message);

  const existing = (existingData ?? []) as Category[];
  const l1ByName = new Map(
    existing.filter((c) => c.level === 1).map((c) => [c.name.toLowerCase(), c]),
  );
  const l2ByParentAndName = new Map(
    existing
      .filter((c) => c.level === 2 && c.parent_id)
      .map((c) => [`${c.parent_id}::${c.name.toLowerCase()}`, c]),
  );

  const errors: CategoryBulkResult["errors"] = [];
  let skipped = 0;

  // --- Pass 1: create any missing L1 categories, in bulk. ---
  const newL1Names = new Map<string, { name: string; emoji: string | null }>();
  rows.forEach((row, i) => {
    const name = (row.category || "").trim();
    if (!name) {
      errors.push({ row: i + 2, message: "Missing category (L1 name)" });
      return;
    }
    if (!l1ByName.has(name.toLowerCase()) && !newL1Names.has(name.toLowerCase())) {
      newL1Names.set(name.toLowerCase(), { name, emoji: row.emoji?.trim() || null });
    }
  });

  if (newL1Names.size > 0) {
    const existingL1MaxSort = Math.max(
      0,
      ...existing.filter((c) => c.level === 1).map((c) => c.sort_order),
    );
    const toInsert = Array.from(newL1Names.values()).map((c, i) => ({
      name: c.name,
      slug: slugify(c.name),
      level: 1,
      parent_id: null,
      emoji: c.emoji,
      sort_order: existingL1MaxSort + i + 1,
    }));

    const { data: inserted, error: insertL1Error } = await supabase
      .from("categories")
      .insert(toInsert)
      .select("*");
    if (insertL1Error) throw new Error(insertL1Error.message);

    for (const c of (inserted ?? []) as Category[]) {
      l1ByName.set(c.name.toLowerCase(), c);
    }
  }

  // --- Pass 2: create any missing L2 subcategories, in bulk. ---
  const newL2 = new Map<
    string,
    { name: string; parent: Category }
  >();

  rows.forEach((row, i) => {
    const categoryName = (row.category || "").trim();
    const subName = (row.subcategory || "").trim();
    if (!categoryName || !subName) return; // L1-only row, or already errored above

    const parent = l1ByName.get(categoryName.toLowerCase());
    if (!parent) {
      errors.push({ row: i + 2, message: `Couldn't resolve parent category "${categoryName}"` });
      return;
    }

    const key = `${parent.id}::${subName.toLowerCase()}`;
    if (l2ByParentAndName.has(key)) {
      skipped++;
      return;
    }
    if (!newL2.has(key)) {
      newL2.set(key, { name: subName, parent });
    }
  });

  let createdL2 = 0;
  if (newL2.size > 0) {
    const sortByParent = new Map<string, number>();
    for (const c of existing.filter((c) => c.level === 2)) {
      const current = sortByParent.get(c.parent_id!) ?? 0;
      sortByParent.set(c.parent_id!, Math.max(current, c.sort_order));
    }

    const toInsert = Array.from(newL2.values()).map(({ name, parent }) => {
      const nextSort = (sortByParent.get(parent.id) ?? 0) + 1;
      sortByParent.set(parent.id, nextSort);
      return {
        name,
        slug: `${parent.slug}-${slugify(name)}`,
        level: 2,
        parent_id: parent.id,
        emoji: null,
        sort_order: nextSort,
      };
    });

    const { error: insertL2Error, count } = await supabase
      .from("categories")
      .insert(toInsert, { count: "exact" });
    if (insertL2Error) throw new Error(insertL2Error.message);
    createdL2 = count ?? toInsert.length;
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/listings/new");

  return { createdL1: newL1Names.size, createdL2, skipped, errors };
}

export type CategoryDeleteResult = {
  deleted: number;
  blocked: { name: string; reason: string }[];
};

// Deletes categories, refusing any that (or whose L2 children, for an L1)
// still have listings attached — the DB's ON DELETE RESTRICT on
// listings.category_id would reject those anyway, but pre-checking lets us
// report *which* categories are blocked and why, in one pass, instead of
// failing the whole batch on the first conflict.
export async function bulkDeleteCategories(ids: string[]): Promise<CategoryDeleteResult> {
  if (ids.length === 0) return { deleted: 0, blocked: [] };

  const supabase = await createClient();
  const { data: allCategories, error: fetchError } = await supabase
    .from("categories")
    .select("*");
  if (fetchError) throw new Error(fetchError.message);

  const categories = (allCategories ?? []) as Category[];
  const byId = new Map(categories.map((c) => [c.id, c]));

  const blocked: CategoryDeleteResult["blocked"] = [];
  const deletable: string[] = [];

  for (const id of ids) {
    const cat = byId.get(id);
    if (!cat) continue;

    const descendantIds =
      cat.level === 1
        ? [id, ...categories.filter((c) => c.parent_id === id).map((c) => c.id)]
        : [id];

    const { count } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .in("category_id", descendantIds);

    if (count && count > 0) {
      blocked.push({
        name: cat.name,
        reason: `${count} listing${count === 1 ? "" : "s"} still use${count === 1 ? "s" : ""} this category`,
      });
    } else {
      deletable.push(id);
    }
  }

  if (deletable.length === 0) {
    return { deleted: 0, blocked };
  }

  const { error: deleteError, count } = await supabase
    .from("categories")
    .delete({ count: "exact" })
    .in("id", deletable);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath("/admin/categories");
  revalidatePath("/admin/listings/new");

  return { deleted: count ?? deletable.length, blocked };
}
