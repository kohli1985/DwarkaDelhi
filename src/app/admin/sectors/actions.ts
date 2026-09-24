"use server";

// Server Actions for admin sector management. Same auth model as
// src/app/admin/actions.ts — runs under the signed-in admin's session, so
// writes go through the "authenticated users manage sectors" RLS policy
// (supabase/migrations/0003_sectors.sql).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Sector } from "@/lib/supabase/types";

// Callable from client components (it's just another export from a "use
// server" file) — used by the listings bulk-upload page to show the current
// valid sector ids without hardcoding them.
export async function listSectors(): Promise<Sector[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sectors").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Sector[];
}

export async function createSector(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const latitude = parseCoordinate(formData.get("latitude"));
  const longitude = parseCoordinate(formData.get("longitude"));

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Sector number must be a positive whole number");
  }
  if (!name) throw new Error("Name is required");

  const supabase = await createClient();

  const { data: maxSort } = await supabase
    .from("sectors")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("sectors").insert({
    id,
    name,
    latitude,
    longitude,
    sort_order: ((maxSort as { sort_order: number } | null)?.sort_order ?? 0) + 1,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/sectors");
  revalidatePath("/admin/listings/new");
}

// "" -> null (cleared), a valid number -> that number, anything else throws
// so a typo doesn't silently save as null.
function parseCoordinate(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  if (!Number.isFinite(n)) throw new Error(`"${str}" isn't a valid coordinate`);
  return n;
}

// Sets or clears a sector's lat/lng — used by the inline location fields in
// SectorsManager. Kept separate from createSector/bulk add so editing a
// coordinate later doesn't touch anything else about the sector.
export async function updateSectorLocation(
  id: number,
  latitude: number | null,
  longitude: number | null,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("sectors").update({ latitude, longitude }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sectors");
}

export type SectorLocationBulkRow = {
  id: number;
  // undefined = cell was blank in the CSV -> leave that field untouched.
  // null = an explicit clear would go here if we ever want that; the CSV
  // importer in SectorsManager never produces null, only undefined or a
  // number, so a blank cell can't accidentally wipe out a saved coordinate.
  latitude?: number;
  longitude?: number;
};

export type SectorLocationBulkResult = {
  updated: number;
  skipped: { id: number; reason: string }[];
};

// Updates ONLY latitude/longitude for the given sector ids — name,
// visibility, sort order etc. are left exactly as they are, even if the
// uploaded CSV has other columns. Rows with no usable coordinate are
// skipped rather than failing the whole batch.
export async function bulkUpdateSectorLocations(
  rows: SectorLocationBulkRow[],
): Promise<SectorLocationBulkResult> {
  const supabase = await createClient();
  const skipped: SectorLocationBulkResult["skipped"] = [];
  let updated = 0;

  for (const row of rows) {
    if (!Number.isInteger(row.id)) {
      skipped.push({ id: row.id, reason: "Invalid sector id" });
      continue;
    }

    const patch: { latitude?: number; longitude?: number } = {};
    if (row.latitude !== undefined) patch.latitude = row.latitude;
    if (row.longitude !== undefined) patch.longitude = row.longitude;
    if (Object.keys(patch).length === 0) {
      skipped.push({ id: row.id, reason: "No latitude/longitude given" });
      continue;
    }

    const { error, count } = await supabase
      .from("sectors")
      .update(patch, { count: "exact" })
      .eq("id", row.id);

    if (error) {
      skipped.push({ id: row.id, reason: error.message });
      continue;
    }
    if (!count) {
      skipped.push({ id: row.id, reason: "No sector with this id" });
      continue;
    }
    updated++;
  }

  revalidatePath("/admin/sectors");
  revalidatePath("/");
  return { updated, skipped };
}

export type SectorBulkRow = { id: number; name: string };

export type SectorBulkResult = {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

// Adds sectors from pasted "id, name" rows (see SectorsManager's bulk-add
// textarea). Additive only — an id that already exists is skipped, never
// overwritten, matching the pattern bulkCreateCategories uses.
export async function bulkCreateSectors(rows: SectorBulkRow[]): Promise<SectorBulkResult> {
  const supabase = await createClient();
  const { data: existingData, error: fetchError } = await supabase
    .from("sectors")
    .select("id, sort_order");
  if (fetchError) throw new Error(fetchError.message);

  const existing = (existingData ?? []) as { id: number; sort_order: number }[];
  const existingIds = new Set(existing.map((s) => s.id));
  let maxSort = Math.max(0, ...existing.map((s) => s.sort_order));

  const errors: SectorBulkResult["errors"] = [];
  const seen = new Set<number>();
  const toInsert: { id: number; name: string; sort_order: number }[] = [];
  let skipped = 0;

  rows.forEach((row, i) => {
    const rowNumber = i + 1;
    const id = Number(row.id);
    const name = (row.name || "").trim() || `Sector ${id}`;

    if (!Number.isInteger(id) || id <= 0) {
      errors.push({ row: rowNumber, message: `Invalid sector number "${row.id}"` });
      return;
    }
    if (existingIds.has(id) || seen.has(id)) {
      skipped++;
      return;
    }
    seen.add(id);
    maxSort += 1;
    toInsert.push({ id, name, sort_order: maxSort });
  });

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("sectors").insert(toInsert);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/admin/sectors");
  revalidatePath("/admin/listings/new");

  return { created: toInsert.length, skipped, errors };
}

// Flips a sector's public visibility. Doesn't affect whether it can be
// assigned to listings in the admin — just whether it shows up in the
// public search filter / sector chips.
export async function toggleSectorActive(id: number, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("sectors").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sectors");
  revalidatePath("/");
}

export type SectorDeleteResult = {
  deleted: number;
  blocked: { id: number; name: string; reason: string }[];
};

// Deletes sectors, refusing any that still have listings attached — the
// DB's ON DELETE RESTRICT on listings.sector would reject those anyway, but
// pre-checking lets us report *which* sectors are blocked and why, instead
// of failing the whole batch on the first conflict (same pattern as
// bulkDeleteCategories).
export async function bulkDeleteSectors(ids: number[]): Promise<SectorDeleteResult> {
  if (ids.length === 0) return { deleted: 0, blocked: [] };

  const supabase = await createClient();
  const { data: sectorsData, error: fetchError } = await supabase
    .from("sectors")
    .select("*")
    .in("id", ids);
  if (fetchError) throw new Error(fetchError.message);

  const sectorsById = new Map(((sectorsData ?? []) as Sector[]).map((s) => [s.id, s]));
  const blocked: SectorDeleteResult["blocked"] = [];
  const deletable: number[] = [];

  for (const id of ids) {
    const sector = sectorsById.get(id);
    if (!sector) continue;

    const { count } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("sector", id);

    if (count && count > 0) {
      blocked.push({
        id,
        name: sector.name,
        reason: `${count} listing${count === 1 ? "" : "s"} still use${count === 1 ? "s" : ""} this sector`,
      });
    } else {
      deletable.push(id);
    }
  }

  if (deletable.length === 0) {
    return { deleted: 0, blocked };
  }

  const { error: deleteError, count } = await supabase
    .from("sectors")
    .delete({ count: "exact" })
    .in("id", deletable);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath("/admin/sectors");
  revalidatePath("/");

  return { deleted: count ?? deletable.length, blocked };
}
