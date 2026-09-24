"use server";

// Server Actions for admin apartment management. Same auth model as
// src/app/admin/sectors/actions.ts — writes go through the "authenticated
// users manage apartments" RLS policy (supabase/migrations/0007_apartments.sql).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Apartment } from "@/lib/supabase/types";

export type ApartmentWithSector = Apartment & { sector_name: string };

export async function listApartments(): Promise<ApartmentWithSector[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apartments")
    .select("*, sectors(name)")
    .order("name");
  if (error) throw new Error(error.message);

  return ((data ?? []) as (Apartment & { sectors: { name: string } | null })[]).map((row) => {
    const { sectors, ...apartment } = row;
    return { ...apartment, sector_name: sectors?.name ?? `Sector ${apartment.sector_id}` };
  });
}

export async function createApartment(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const sectorId = Number(formData.get("sectorId"));
  const address = String(formData.get("address") || "").trim() || null;

  if (!name) throw new Error("Name is required");
  if (!Number.isInteger(sectorId) || sectorId <= 0) {
    throw new Error("Choose a sector");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("apartments").insert({ name, sector_id: sectorId, address });
  if (error) {
    // Postgres unique_violation on (lower(name), sector_id)
    if (error.code === "23505") {
      throw new Error(`"${name}" is already recorded in this sector`);
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/apartments");
}

export type ApartmentBulkRow = { name: string; sectorId: number; address?: string };

export type ApartmentBulkResult = {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

// Adds apartments from pasted "name, sector number" rows. Additive only —
// a name already recorded for that sector is skipped, never overwritten or
// duplicated, matching bulkCreateSectors' pattern.
export async function bulkCreateApartments(rows: ApartmentBulkRow[]): Promise<ApartmentBulkResult> {
  const supabase = await createClient();

  const { data: sectorsData, error: sectorsError } = await supabase.from("sectors").select("id");
  if (sectorsError) throw new Error(sectorsError.message);
  const validSectorIds = new Set(((sectorsData ?? []) as { id: number }[]).map((s) => s.id));

  const { data: existingData, error: fetchError } = await supabase
    .from("apartments")
    .select("name, sector_id");
  if (fetchError) throw new Error(fetchError.message);
  const existing = new Set(
    ((existingData ?? []) as { name: string; sector_id: number }[]).map(
      (a) => `${a.sector_id}:${a.name.toLowerCase()}`,
    ),
  );

  const errors: ApartmentBulkResult["errors"] = [];
  const seen = new Set<string>();
  const toInsert: { name: string; sector_id: number; address: string | null }[] = [];
  let skipped = 0;

  rows.forEach((row, i) => {
    const rowNumber = i + 1;
    const name = (row.name || "").trim();
    const sectorId = Number(row.sectorId);

    if (!name) {
      errors.push({ row: rowNumber, message: "Missing apartment name" });
      return;
    }
    if (!Number.isInteger(sectorId) || !validSectorIds.has(sectorId)) {
      errors.push({ row: rowNumber, message: `Unknown sector "${row.sectorId}"` });
      return;
    }

    const key = `${sectorId}:${name.toLowerCase()}`;
    if (existing.has(key) || seen.has(key)) {
      skipped++;
      return;
    }
    seen.add(key);
    const address = row.address?.trim() || null;
    toInsert.push({ name, sector_id: sectorId, address });
  });

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("apartments").insert(toInsert);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/admin/apartments");

  return { created: toInsert.length, skipped, errors };
}

export async function bulkDeleteApartments(ids: string[]): Promise<{ deleted: number }> {
  if (ids.length === 0) return { deleted: 0 };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("apartments")
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/apartments");
  return { deleted: count ?? ids.length };
}
