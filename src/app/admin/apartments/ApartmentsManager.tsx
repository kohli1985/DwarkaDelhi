"use client";

import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import type { Sector } from "@/lib/supabase/types";
import { useToast } from "@/components/Toast";
import {
  createApartment,
  bulkCreateApartments,
  bulkDeleteApartments,
  type ApartmentBulkResult,
  type ApartmentWithSector,
} from "./actions";

export default function ApartmentsManager({
  apartments,
  sectors,
}: {
  apartments: ApartmentWithSector[];
  sectors: Sector[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<ApartmentBulkResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apartments;
    return apartments.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.sector_name.toLowerCase().includes(q) ||
        (a.address ?? "").toLowerCase().includes(q),
    );
  }, [apartments, search]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const someSelected = filtered.some((a) => selected.has(a.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        filtered.forEach((a) => next.delete(a.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((a) => next.add(a.id));
      return next;
    });
  }

  function handleAddSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createApartment(formData);
        setShowAddForm(false);
        show("Apartment added");
      } catch (err) {
        show(err instanceof Error ? err.message : "Couldn't add apartment", "error");
      }
    });
  }

  // Resolves the sector column against the known sectors list, accepting
  // either the bare number ("6") or the display name ("Sector 6" / "sector
  // 6") — bulk-pasted data (e.g. from an LLM or a spreadsheet) often uses
  // the name, and Number("Sector 6") would otherwise always fail as NaN.
  function resolveSectorId(raw: string): number {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const byName = sectors.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (byName) return byName.id;
    const digitsMatch = trimmed.match(/\d+/);
    if (digitsMatch) {
      const id = Number(digitsMatch[0]);
      if (sectors.some((s) => s.id === id)) return id;
    }
    return NaN;
  }

  function handleBulkSubmit() {
    // Papa.parse (not a plain split(",")) so a quoted address containing
    // its own commas — "Plot 12, Sector 6, Dwarka, New Delhi" — is read as
    // one field instead of being shredded across several.
    const parsed = Papa.parse<string[]>(bulkText.trim(), { skipEmptyLines: true });
    const dataRows = parsed.data.filter((cols) => cols.length > 0 && cols.some((c) => c.trim()));

    // Resolve sectors client-side first, so a row that can't be matched
    // reports exactly what we tried to match ("Sector 6 (typo?)") instead of
    // the server just seeing a bare NaN and saying "Unknown sector NaN".
    const clientErrors: { row: number; message: string }[] = [];
    const rows: { name: string; sectorId: number; address?: string }[] = [];

    dataRows.forEach((cols, i) => {
      const [namePart, sectorPart, addressPart] = cols;
      const name = (namePart ?? "").trim();
      const sectorRaw = (sectorPart ?? "").trim();
      const sectorId = resolveSectorId(sectorRaw);

      if (!name) {
        clientErrors.push({ row: i + 1, message: "Missing apartment name" });
        return;
      }
      if (!Number.isInteger(sectorId)) {
        clientErrors.push({
          row: i + 1,
          message: `Couldn't match sector "${sectorRaw}" to any sector in your list`,
        });
        return;
      }
      rows.push({ name, sectorId, address: addressPart?.trim() || undefined });
    });

    if (rows.length === 0 && clientErrors.length === 0) return;

    startTransition(async () => {
      const result =
        rows.length > 0
          ? await bulkCreateApartments(rows)
          : { created: 0, skipped: 0, errors: [] as { row: number; message: string }[] };
      const merged = { ...result, errors: [...clientErrors, ...result.errors] };
      setBulkResult(merged);
      if (merged.errors.length === 0) {
        setBulkText("");
      }
      show(
        `${merged.created} apartment${merged.created === 1 ? "" : "s"} added${
          result.skipped > 0 ? `, ${result.skipped} skipped` : ""
        }`,
        merged.errors.length > 0 ? "error" : "success",
      );
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} apartment${selected.size === 1 ? "" : "s"}? This can't be undone.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await bulkDeleteApartments(Array.from(selected));
      setSelected(new Set());
      show(`${result.deleted} apartment${result.deleted === 1 ? "" : "s"} deleted`);
    });
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setShowBulkForm(false);
            }}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            {showAddForm ? "Cancel" : "+ New apartment"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowBulkForm((v) => !v);
              setShowAddForm(false);
            }}
            className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            {showBulkForm ? "Cancel" : "Bulk add"}
          </button>
        </div>

        {someSelected && (
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Deleting…" : `Delete selected (${selected.size})`}
          </button>
        )}
      </div>

      {showAddForm && (
        <form
          action={handleAddSubmit}
          className="mt-4 flex flex-wrap items-end gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-5"
        >
          <label className="text-sm font-medium text-foreground/80">
            Apartment / society name
            <input
              name="name"
              required
              className={inputClass}
              placeholder="e.g. Sai CGHS"
            />
          </label>
          <label className="text-sm font-medium text-foreground/80">
            Sector
            <select name="sectorId" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Choose a sector
              </option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-foreground/80">
            Address <span className="font-normal text-foreground/40">(optional)</span>
            <input
              name="address"
              className={`${inputClass} w-64`}
              placeholder="e.g. Plot 12, Sector 6, Dwarka"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {showBulkForm && (
        <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-5">
          <p className="text-sm text-foreground/70">
            One apartment per line, as{" "}
            <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">
              name, sector number, address
            </code>{" "}
            — e.g.{" "}
            <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">
              Sai CGHS, 6, Plot 12, Sector 6, Dwarka
            </code>
            . Address is optional. A name already recorded for that sector is skipped, never
            duplicated.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            placeholder={
              "Sai CGHS, 6, Plot 12, Sector 6, Dwarka\nVardhman Apartments, 6\nSarthak Apartments, 12"
            }
            className={`${inputClass} mt-3 w-full font-mono`}
          />
          <button
            type="button"
            onClick={handleBulkSubmit}
            disabled={isPending || bulkText.trim().length === 0}
            className="mt-3 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add apartments"}
          </button>

          {bulkResult && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-foreground">
                {bulkResult.created} apartment{bulkResult.created === 1 ? "" : "s"} added.
                {bulkResult.skipped > 0 && ` ${bulkResult.skipped} skipped (already existed).`}
              </p>
              {bulkResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-red-600">
                  {bulkResult.errors.map((e, i) => (
                    <li key={i}>
                      Line {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="relative max-w-xs">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apartments or sectors"
            autoComplete="off"
            className={`${inputClass} w-full pl-9`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {search && (
          <p className="mt-2 text-xs text-foreground/50">
            {filtered.length} of {apartments.length} apartments match
          </p>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 bg-foreground/[0.02] text-foreground/60">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-foreground/30"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-foreground/5 last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                    className="h-4 w-4 rounded border-foreground/30"
                    aria-label={`Select ${a.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">{a.name}</td>
                <td className="px-4 py-3 text-foreground/70">{a.sector_name}</td>
                <td className="px-4 py-3 text-foreground/60">{a.address || "—"}</td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-foreground/50">
                  {apartments.length === 0
                    ? "No apartments recorded yet — add one above."
                    : `No apartments match "${search}"`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1.5 block rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-brand";
