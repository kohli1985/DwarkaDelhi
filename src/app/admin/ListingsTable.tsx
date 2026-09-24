"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/supabase/types";
import { bulkDeleteListings, deleteListing } from "./actions";
import { useToast } from "@/components/Toast";

type Props = {
  listings: Listing[];
  categoryPathById: Record<string, string>;
};

export default function ListingsTable({ listings, categoryPathById }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();

  // Basic client-side search — the whole list is already loaded, so no
  // need for a server round-trip. Matches name, category path, sector
  // number, address, and phone, so "sector 6" or a phone digit works too.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((l) => {
      const haystack = [
        l.name,
        categoryPathById[l.category_id] ?? "",
        `sector ${l.sector}`,
        l.address ?? "",
        l.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listings, categoryPathById, search]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const someSelected = filtered.some((l) => selected.has(l.id)) && !allSelected;

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        filtered.forEach((l) => next.delete(l.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((l) => next.add(l.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} listing${selected.size === 1 ? "" : "s"}? This can't be undone.`,
      )
    )
      return;

    const count = selected.size;
    startTransition(async () => {
      await bulkDeleteListings(Array.from(selected));
      setSelected(new Set());
      show(`${count} listing${count === 1 ? "" : "s"} deleted`);
    });
  }

  function handleSingleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteListing(id);
      show(`"${name}" deleted`);
    });
  }

  const selectedCount = useMemo(() => selected.size, [selected]);

  return (
    <div className="mt-8">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search listings by name, category, sector, address, phone…"
          autoComplete="off"
          className="w-full rounded-full border border-foreground/15 bg-background py-2.5 pl-10 pr-10 text-sm text-foreground outline-none focus:border-brand"
        />
        {search.length > 0 && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
      </div>

      {search && (
        <p className="mt-2 text-xs text-foreground/50">
          {filtered.length} of {listings.length} listing{listings.length === 1 ? "" : "s"} match.
        </p>
      )}

      {selectedCount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Deleting…" : "Delete selected"}
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 bg-foreground/[0.02] text-foreground/60">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-foreground/30"
                  aria-label="Select all listings"
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((listing) => (
              <tr key={listing.id} className="border-b border-foreground/5 last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(listing.id)}
                    onChange={() => toggleOne(listing.id)}
                    className="h-4 w-4 rounded border-foreground/30"
                    aria-label={`Select ${listing.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {listing.name}
                  {listing.featured && (
                    <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand-dark">
                      Featured
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {categoryPathById[listing.category_id] ?? "—"}
                </td>
                <td className="px-4 py-3 text-foreground/70">Sector {listing.sector}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      listing.is_published
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {listing.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/listings/${listing.id}/edit`}
                      className="font-medium text-brand-dark hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleSingleDelete(listing.id, listing.name)}
                      disabled={isPending}
                      className="font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && listings.length > 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-foreground/50">
                  No listings match &quot;{search}&quot;.
                </td>
              </tr>
            )}

            {listings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-foreground/50">
                  No listings yet — add your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
