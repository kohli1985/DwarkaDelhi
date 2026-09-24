"use client";

import { useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import type { Sector } from "@/lib/supabase/types";
import { useToast } from "@/components/Toast";
import {
  createSector,
  bulkCreateSectors,
  toggleSectorActive,
  bulkDeleteSectors,
  updateSectorLocation,
  bulkUpdateSectorLocations,
  type SectorBulkResult,
  type SectorDeleteResult,
  type SectorLocationBulkResult,
} from "./actions";

export default function SectorsManager({ sectors }: { sectors: Sector[] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<SectorBulkResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteResult, setDeleteResult] = useState<SectorDeleteResult | null>(null);
  const [showLocationCsv, setShowLocationCsv] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<SectorLocationBulkResult | null>(null);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();

  // Builds a CSV of the current sectors (id, name, latitude, longitude) so
  // editing coordinates for many sectors can happen in a spreadsheet instead
  // of one row at a time. Name/id are there for reference only — the
  // importer below reads them back but never writes them; only latitude
  // and longitude are ever applied.
  function downloadLocationTemplate() {
    const csv = Papa.unparse({
      fields: ["id", "name", "latitude", "longitude"],
      data: sectors.map((s) => [s.id, s.name, s.latitude ?? "", s.longitude ?? ""]),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sector-locations.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleLocationCsvFile(file: File) {
    setCsvFileName(file.name);
    setCsvResult(null);
    setCsvParseError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (!headers.includes("id")) {
          setCsvParseError('CSV needs an "id" column matching the sector number.');
          return;
        }

        const rows = results.data
          .map((r) => {
            const id = Number(r.id);
            const latRaw = r.latitude?.trim();
            const lngRaw = r.longitude?.trim();
            return {
              id,
              latitude: latRaw ? Number(latRaw) : undefined,
              longitude: lngRaw ? Number(lngRaw) : undefined,
            };
          })
          .filter((r) => Number.isInteger(r.id));

        startTransition(async () => {
          const result = await bulkUpdateSectorLocations(rows);
          setCsvResult(result);
          show(
            `${result.updated} sector location${result.updated === 1 ? "" : "s"} updated${
              result.skipped.length > 0 ? `, ${result.skipped.length} skipped` : ""
            }`,
            result.skipped.length > 0 && result.updated === 0 ? "error" : "success",
          );
        });
      },
      error: (err) => {
        setCsvParseError(`Couldn't read file: ${err.message}`);
      },
    });
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createSector(formData);
        setShowAddForm(false);
        show("Sector added");
      } catch (err) {
        show(err instanceof Error ? err.message : "Couldn't add sector", "error");
      }
    });
  }

  function handleBulkSubmit() {
    const rows = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [idPart, ...nameParts] = line.split(",");
        return { id: Number((idPart ?? "").trim()), name: nameParts.join(",").trim() };
      });

    if (rows.length === 0) return;

    startTransition(async () => {
      const result = await bulkCreateSectors(rows);
      setBulkResult(result);
      if (result.errors.length === 0) {
        setBulkText("");
      }
      show(
        `${result.created} sector${result.created === 1 ? "" : "s"} added${
          result.skipped > 0 ? `, ${result.skipped} skipped` : ""
        }`,
        result.errors.length > 0 ? "error" : "success",
      );
    });
  }

  function handleToggleActive(id: number, next: boolean) {
    startTransition(async () => {
      await toggleSectorActive(id, next);
      show(next ? "Sector is now visible on the site" : "Sector hidden from the site");
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} sector${selected.size === 1 ? "" : "s"}? This can't be undone.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await bulkDeleteSectors(Array.from(selected));
      setDeleteResult(result);
      setSelected(new Set());
      show(
        `${result.deleted} sector${result.deleted === 1 ? "" : "s"} deleted${
          result.blocked.length > 0 ? `, ${result.blocked.length} blocked` : ""
        }`,
        result.blocked.length > 0 ? "error" : "success",
      );
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
            {showAddForm ? "Cancel" : "+ New sector"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowBulkForm((v) => !v);
              setShowAddForm(false);
              setShowLocationCsv(false);
            }}
            className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            {showBulkForm ? "Cancel" : "Bulk add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLocationCsv((v) => !v);
              setShowAddForm(false);
              setShowBulkForm(false);
            }}
            className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            {showLocationCsv ? "Cancel" : "Update locations (CSV)"}
          </button>
        </div>

        {selected.size > 0 && (
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
            Sector number
            <input
              name="id"
              type="number"
              min={1}
              required
              className={`${inputClass} w-28`}
              placeholder="e.g. 7"
            />
          </label>
          <label className="text-sm font-medium text-foreground/80">
            Name
            <input
              name="name"
              required
              className={inputClass}
              placeholder="e.g. Sector 7"
            />
          </label>
          <label className="text-sm font-medium text-foreground/80">
            Latitude <span className="font-normal text-foreground/40">(optional)</span>
            <input
              name="latitude"
              type="number"
              step="any"
              className={`${inputClass} w-32`}
              placeholder="28.5921"
            />
          </label>
          <label className="text-sm font-medium text-foreground/80">
            Longitude <span className="font-normal text-foreground/40">(optional)</span>
            <input
              name="longitude"
              type="number"
              step="any"
              className={`${inputClass} w-32`}
              placeholder="77.0460"
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
            One sector per line, as <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">number, name</code>{" "}
            — e.g. <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">7, Sector 7</code>. Name is
            optional (defaults to &quot;Sector N&quot;). Existing sector numbers are skipped, never overwritten.
            Add coordinates afterwards from the table below if you want search results ranked by distance.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            placeholder={"7, Sector 7\n8, Sector 8"}
            className={`${inputClass} mt-3 w-full font-mono`}
          />
          <button
            type="button"
            onClick={handleBulkSubmit}
            disabled={isPending || bulkText.trim().length === 0}
            className="mt-3 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add sectors"}
          </button>

          {bulkResult && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-foreground">
                {bulkResult.created} sector{bulkResult.created === 1 ? "" : "s"} added.
                {bulkResult.skipped > 0 &&
                  ` ${bulkResult.skipped} skipped (already existed).`}
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

      {showLocationCsv && (
        <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-5">
          <p className="text-sm text-foreground/70">
            Download the current sectors as a CSV, fill in{" "}
            <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">latitude</code> /{" "}
            <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">longitude</code> in a
            spreadsheet, then upload it back. Only those two columns are ever applied — name,
            visibility and everything else stay exactly as they are, even if you edit them in the
            file. A blank latitude or longitude cell leaves that sector&apos;s existing value
            untouched rather than clearing it.
          </p>

          <button
            type="button"
            onClick={downloadLocationTemplate}
            className="mt-3 rounded-full border border-foreground/15 px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            Download template (CSV)
          </button>

          <div className="mt-4 flex items-center gap-3">
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLocationCsvFile(file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => csvFileInputRef.current?.click()}
              disabled={isPending}
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {isPending ? "Uploading…" : "Upload filled-in CSV"}
            </button>
            {csvFileName && <span className="text-sm text-foreground/60">{csvFileName}</span>}
          </div>

          {csvParseError && <p className="mt-3 text-sm text-red-600">{csvParseError}</p>}

          {csvResult && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-foreground">
                {csvResult.updated} sector location{csvResult.updated === 1 ? "" : "s"} updated.
                {csvResult.skipped.length > 0 && ` ${csvResult.skipped.length} skipped.`}
              </p>
              {csvResult.skipped.length > 0 && (
                <ul className="mt-2 space-y-1 text-red-600">
                  {csvResult.skipped.map((s, i) => (
                    <li key={i}>
                      Sector {s.id}: {s.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {deleteResult && (
        <div className="mt-4 rounded-xl border border-foreground/10 bg-background p-4 text-sm">
          <p className="font-medium text-foreground">
            {deleteResult.deleted} sector{deleteResult.deleted === 1 ? "" : "s"} deleted.
          </p>
          {deleteResult.blocked.length > 0 && (
            <ul className="mt-2 space-y-1 text-red-600">
              {deleteResult.blocked.map((b) => (
                <li key={b.id}>
                  Sector {b.id} ({b.name}): not deleted — {b.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 bg-foreground/[0.02] text-foreground/60">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">
                Location{" "}
                <span className="font-normal normal-case text-foreground/40">
                  (for &quot;near me&quot; ranking)
                </span>
              </th>
              <th className="px-4 py-3 font-medium">Visible on site</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => (
              <tr key={s.id} className="border-b border-foreground/5 last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4 rounded border-foreground/30"
                    aria-label={`Select sector ${s.id}`}
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground/50">{s.id}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                <td className="px-4 py-3">
                  <SectorLocationCell sector={s} />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.is_active}
                    disabled={isPending}
                    onClick={() => handleToggleActive(s.id, !s.is_active)}
                    className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-60 ${
                      s.is_active ? "bg-brand" : "bg-foreground/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        s.is_active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}

            {sectors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-foreground/50">
                  No sectors yet — add one above.
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

// Inline lat/lng editor for one sector row. Local draft state so typing
// doesn't round-trip to the server on every keystroke — it saves on blur,
// same pattern as a spreadsheet cell, and only calls the server action when
// the value actually changed.
function SectorLocationCell({ sector }: { sector: Sector }) {
  const [lat, setLat] = useState(sector.latitude?.toString() ?? "");
  const [lng, setLng] = useState(sector.longitude?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();

  function save() {
    const nextLat = lat.trim() === "" ? null : Number(lat);
    const nextLng = lng.trim() === "" ? null : Number(lng);

    if ((nextLat !== null && Number.isNaN(nextLat)) || (nextLng !== null && Number.isNaN(nextLng))) {
      show("Latitude/longitude must be numbers", "error");
      return;
    }
    if (nextLat === sector.latitude && nextLng === sector.longitude) return;

    startTransition(async () => {
      try {
        await updateSectorLocation(sector.id, nextLat, nextLng);
        show(`Location saved for ${sector.name}`);
      } catch (err) {
        show(err instanceof Error ? err.message : "Couldn't save location", "error");
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={lat}
        onChange={(e) => setLat(e.target.value)}
        onBlur={save}
        disabled={isPending}
        placeholder="Lat"
        inputMode="decimal"
        className="w-20 rounded-md border border-foreground/15 bg-background px-2 py-1 font-mono text-xs outline-none focus:border-brand disabled:opacity-60"
      />
      <input
        value={lng}
        onChange={(e) => setLng(e.target.value)}
        onBlur={save}
        disabled={isPending}
        placeholder="Lng"
        inputMode="decimal"
        className="w-20 rounded-md border border-foreground/15 bg-background px-2 py-1 font-mono text-xs outline-none focus:border-brand disabled:opacity-60"
      />
    </div>
  );
}
