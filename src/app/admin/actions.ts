"use server";

// Server Actions for admin listing management. These run with the signed-in
// admin's session (via the cookie-based Supabase server client), so writes
// are governed by the "authenticated users manage listings" RLS policy in
// supabase/migrations/0001_init.sql — no service-role key needed here.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { embed, embedBatch } from "@/lib/voyage";
import type { ListingInput } from "@/lib/supabase/types";

function readListingInput(formData: FormData): ListingInput {
  return {
    name: String(formData.get("name") || "").trim(),
    category_id: String(formData.get("category_id") || ""),
    description: String(formData.get("description") || "").trim(),
    sector: Number(formData.get("sector")),
    address: (formData.get("address") as string) || null,
    landmark: (formData.get("landmark") as string) || null,
    phone: (formData.get("phone") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    website: (formData.get("website") as string) || null,
    instagram: (formData.get("instagram") as string) || null,
    hours_text: (formData.get("hours_text") as string) || null,
    price_range: (formData.get("price_range") as string) || null,
    is_published: formData.get("is_published") === "on",
    featured: formData.get("featured") === "on",
  };
}

async function embeddingSourceText(input: ListingInput) {
  return [input.name, input.description, input.address, input.landmark]
    .filter(Boolean)
    .join(" ");
}

export async function createListing(formData: FormData) {
  const input = readListingInput(formData);
  const supabase = await createClient();

  const embedding = await embed(await embeddingSourceText(input), "document");

  const { error } = await supabase.from("listings").insert({ ...input, embedding });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateListing(id: string, formData: FormData) {
  const input = readListingInput(formData);
  const supabase = await createClient();

  const embedding = await embed(await embeddingSourceText(input), "document");

  const { error } = await supabase
    .from("listings")
    .update({ ...input, embedding })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteListing(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export type BulkRow = {
  name: string;
  category: string; // L1 category name or slug, matched case-insensitively
  subcategory: string; // L2 subcategory name or slug, matched within that L1
  sector: number;
  description: string;
  address?: string;
  landmark?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  hours_text?: string;
  price_range?: string;
  is_published?: boolean;
  featured?: boolean;
};

export type BulkUploadResult = {
  inserted: number;
  errors: { row: number; name: string; message: string }[];
};

// Bulk-creates listings from parsed CSV rows (see src/app/admin/listings/bulk/page.tsx).
// Validates each row, resolves category by name/slug, embeds all valid rows
// in batched Voyage calls, and inserts in one Supabase call. Runs under the
// signed-in admin's session, same RLS policy as the single-listing actions.
export async function bulkCreateListings(rows: BulkRow[]): Promise<BulkUploadResult> {
  const supabase = await createClient();
  const [
    { data: categoriesData, error: categoriesError },
    { data: sectorsData, error: sectorsError },
  ] = await Promise.all([
    supabase.from("categories").select("*"),
    // All sectors, not just active ones — an admin can still assign listings
    // to a sector before flipping it visible (see src/app/admin/sectors).
    supabase.from("sectors").select("id"),
  ]);
  if (categoriesError) throw new Error(categoriesError.message);
  if (sectorsError) throw new Error(sectorsError.message);

  const categories = (categoriesData ?? []) as {
    id: string;
    slug: string;
    name: string;
    parent_id: string | null;
    level: 1 | 2;
  }[];

  const sectorIds = new Set(((sectorsData ?? []) as { id: number }[]).map((s) => s.id));
  const sectorIdList = Array.from(sectorIds).sort((a, b) => a - b);

  // L1 lookup by name/slug -> id.
  const l1ByKey = new Map<string, string>();
  for (const c of categories.filter((c) => c.level === 1)) {
    l1ByKey.set(c.name.toLowerCase(), c.id);
    l1ByKey.set(c.slug.toLowerCase(), c.id);
  }

  // L2 lookup keyed by "<parent L1 id>::<name or slug>" — subcategory names
  // like "Insurance" repeat under different L1s (Finance vs. Professional &
  // Business Services), so matching needs both columns together, not just
  // the subcategory name alone.
  const l2ByParentAndKey = new Map<string, string>();
  for (const c of categories.filter((c) => c.level === 2 && c.parent_id)) {
    l2ByParentAndKey.set(`${c.parent_id}::${c.name.toLowerCase()}`, c.id);
    l2ByParentAndKey.set(`${c.parent_id}::${c.slug.toLowerCase()}`, c.id);
  }

  const errors: BulkUploadResult["errors"] = [];
  const valid: { row: BulkRow; category_id: string; embedSource: string }[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const name = (row.name || "").trim();

    if (!name) {
      errors.push({ row: rowNumber, name: name || "(blank)", message: "Missing name" });
      return;
    }
    if (!sectorIds.has(row.sector)) {
      errors.push({
        row: rowNumber,
        name,
        message:
          sectorIdList.length > 0
            ? `Invalid sector "${row.sector}" — must be one of ${sectorIdList.join(", ")}. Add it in Admin → Sectors first.`
            : `Invalid sector "${row.sector}" — no sectors exist yet. Add one in Admin → Sectors first.`,
      });
      return;
    }
    const l1Id = l1ByKey.get((row.category || "").trim().toLowerCase());
    if (!l1Id) {
      errors.push({
        row: rowNumber,
        name,
        message: `Unknown category "${row.category}"`,
      });
      return;
    }
    const category_id = l2ByParentAndKey.get(
      `${l1Id}::${(row.subcategory || "").trim().toLowerCase()}`,
    );
    if (!category_id) {
      errors.push({
        row: rowNumber,
        name,
        message: `Unknown subcategory "${row.subcategory}" under "${row.category}"`,
      });
      return;
    }
    if (!row.description || !row.description.trim()) {
      errors.push({ row: rowNumber, name, message: "Missing description" });
      return;
    }

    const embedSource = [name, row.description, row.address, row.landmark]
      .filter(Boolean)
      .join(" ");

    valid.push({ row, category_id, embedSource });
  });

  if (valid.length === 0) {
    return { inserted: 0, errors };
  }

  const embeddings = await embedBatch(
    valid.map((v) => v.embedSource),
    "document",
  );

  const toInsert = valid.map((v, i) => ({
    name: v.row.name.trim(),
    category_id: v.category_id,
    description: v.row.description.trim(),
    sector: v.row.sector,
    address: v.row.address || null,
    landmark: v.row.landmark || null,
    phone: v.row.phone || null,
    whatsapp: v.row.whatsapp || null,
    website: v.row.website || null,
    instagram: v.row.instagram || null,
    hours_text: v.row.hours_text || null,
    price_range: v.row.price_range || null,
    is_published: v.row.is_published ?? true,
    featured: v.row.featured ?? false,
    embedding: embeddings[i],
  }));

  const { error: insertError } = await supabase.from("listings").insert(toInsert);
  if (insertError) {
    // Whole-batch insert failed (e.g. a constraint violation) — surface it
    // as a single error rather than silently reporting partial success.
    return {
      inserted: 0,
      errors: [
        ...errors,
        { row: 0, name: "(batch insert)", message: insertError.message },
      ],
    };
  }

  revalidatePath("/admin");
  return { inserted: toInsert.length, errors };
}

export async function bulkDeleteListings(ids: string[]): Promise<{ deleted: number }> {
  if (ids.length === 0) return { deleted: 0 };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return { deleted: count ?? ids.length };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
