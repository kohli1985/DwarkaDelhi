"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category, Listing, Sector } from "@/lib/supabase/types";
import { formatPhone } from "@/lib/phone";

type Props = {
  category: Category;
  subcategories: Category[];
  sectors: Sector[];
  initialSectorId: number | null;
  initialSubId: string | null;
};

// The dedicated listing page for one L1 category (/category/[slug]) — a
// left-hand filter rail (subcategory + sector, both multi-select) with
// listings on the right. Filters are reflected in the URL as comma-separated
// ids so the page stays shareable/bookmarkable in whatever filtered state
// it's in. The URL still only carries the single initial id it was loaded
// with (from links elsewhere in the app); once the visitor touches a
// filter here, it becomes a full multi-select set.
export default function CategoryListings({
  category,
  subcategories,
  sectors,
  initialSectorId,
  initialSubId,
}: Props) {
  const router = useRouter();
  const [subIds, setSubIds] = useState<Set<string>>(
    initialSubId ? new Set([initialSubId]) : new Set(),
  );
  const [sectorIds, setSectorIds] = useState<Set<number>>(
    initialSectorId !== null ? new Set([initialSectorId]) : new Set(),
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Filters default collapsed on mobile (sm:hidden toggle below) — on
  // desktop the sidebar is always visible regardless of this, via sm:block.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function toggleSub(id: string) {
    setSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSector(id: number) {
    setSectorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateUrl(nextSubIds: Set<string>, nextSectorIds: Set<number>) {
    const params = new URLSearchParams();
    if (nextSectorIds.size > 0) params.set("sector", Array.from(nextSectorIds).join(","));
    if (nextSubIds.size > 0) params.set("sub", Array.from(nextSubIds).join(","));
    const qs = params.toString();
    router.replace(`/category/${category.slug}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  async function fetchListings(
    nextSubIds: Set<string>,
    nextSectorIds: Set<number>,
    nextSortDir: "asc" | "desc",
  ) {
    setLoading(true);
    setError(null);

    const categoryIds = nextSubIds.size > 0 ? Array.from(nextSubIds) : subcategories.map((c) => c.id);
    if (categoryIds.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let query = supabase
      .from("listings")
      .select("*")
      .in("category_id", categoryIds)
      .eq("is_published", true);

    if (nextSectorIds.size > 0) query = query.in("sector", Array.from(nextSectorIds));

    const { data, error: fetchError } = await query
      .order("featured", { ascending: false })
      .order("name", { ascending: nextSortDir === "asc" });

    if (fetchError) {
      setError("Couldn't load listings right now — please try again.");
      setListings([]);
    } else {
      setListings((data as Listing[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: refetching listings for the active filters is the whole point of this effect
    fetchListings(subIds, sectorIds, sortDir);
    updateUrl(subIds, sectorIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when a filter or sort actually changes; re-created Sets each render so compare by content, not identity
  }, [Array.from(subIds).sort().join(","), Array.from(sectorIds).sort().join(","), sortDir]);

  const activeFilterCount = subIds.size + sectorIds.size;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Link href="/" className="text-sm font-medium text-foreground/50 hover:text-foreground">
          ← Back home
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-4xl">{category.emoji}</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{category.name}</h1>
        </div>

        <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
          {/* Filter rail — a sidebar on wider screens; on mobile it's
              collapsed behind a "Filters" toggle by default instead of
              pushing every result below a full-length checkbox list. */}
          <aside className="shrink-0 sm:sticky sm:top-8 sm:w-48 md:w-56">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-foreground/15 px-3.5 py-2.5 text-sm font-semibold text-foreground/80 sm:hidden"
              aria-expanded={filtersOpen}
            >
              <span>
                Filters
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-foreground/50 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5.5 7.5L10 12l4.5-4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className={`${filtersOpen ? "mt-3 block" : "hidden"} sm:mt-0 sm:block`}>
              <div className="flex items-center justify-between">
                <p className="hidden text-xs font-semibold uppercase tracking-wide text-foreground/50 sm:block">
                  Filters
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubIds(new Set());
                      setSectorIds(new Set());
                    }}
                    className="text-xs font-medium text-brand-dark hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {subcategories.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-foreground/40">
                    Category {subIds.size > 0 && `(${subIds.size})`}
                  </p>
                  <div className="flex flex-col items-start gap-1">
                    {subcategories.map((c) => (
                      <FilterCheckbox
                        key={c.id}
                        label={c.name}
                        checked={subIds.has(c.id)}
                        onChange={() => toggleSub(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sectors.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold text-foreground/40">
                    Sector {sectorIds.size > 0 && `(${sectorIds.size})`}
                  </p>
                  <div className="flex flex-col items-start gap-1">
                    {sectors.map((s) => (
                      <FilterCheckbox
                        key={s.id}
                        label={s.name}
                        checked={sectorIds.has(s.id)}
                        onChange={() => toggleSector(s.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Explicit close, mobile only — the toggle button above
                  scrolls out of view once the checkbox list is long, so
                  relying on the visitor to scroll back up and tap it again
                  isn't a reliable way to get back to the results. */}
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="mt-6 w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white sm:hidden"
              >
                {loading ? "Show results" : `Show ${listings.length} result${listings.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex justify-end">
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground/60">Sort by</span>
                <div className="relative">
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                    className="appearance-none rounded-full border border-foreground/15 bg-background py-1.5 pl-3.5 pr-8 text-xs font-semibold text-foreground/80 outline-none transition-colors hover:border-brand/40 focus:border-brand"
                  >
                    <option value="asc">Name (A–Z)</option>
                    <option value="desc">Name (Z–A)</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/40"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5.5 7.5L10 12l4.5-4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </label>
            </div>

            {loading && <p className="text-sm text-foreground/60">Loading listings…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && listings.length === 0 && (
              <p className="text-sm text-foreground/60">
                No listings match this filter yet — try clearing a filter above.
              </p>
            )}

            {!loading && !error && listings.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {listings.map((listing) => {
                  const listingCategory = subcategories.find((c) => c.id === listing.category_id);
                  const cardClassName =
                    "block rounded-xl border border-foreground/10 bg-foreground/[0.02] p-5 transition-colors hover:border-brand/30";
                  const cardContent = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-foreground">{listing.name}</h4>
                          {listing.featured && (
                            <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand-dark">
                              Featured
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-foreground/50">
                          Sector {listing.sector}
                        </span>
                      </div>
                      {listingCategory && subIds.size !== 1 && (
                        <span className="mt-1 inline-block text-xs font-medium text-brand-dark">
                          {listingCategory.name}
                        </span>
                      )}
                      <p className="mt-2 text-sm leading-6 text-foreground/65">
                        {listing.description}
                      </p>
                      {(listing.phone || listing.address) && (
                        <p className="mt-3 text-xs text-foreground/50">
                          {listing.address}
                          {listing.address && listing.phone && " · "}
                          {formatPhone(listing.phone)}
                        </p>
                      )}
                    </>
                  );

                  // Links to the listing's detail page when it has a slug —
                  // a listing created before supabase/migrations/0009 might
                  // not, until scripts/backfill-listing-slugs.mjs runs, so
                  // the card falls back to a plain (unlinked) div rather
                  // than link to a page that doesn't exist yet.
                  return listing.slug ? (
                    <Link
                      key={listing.id}
                      href={`/listing/${listing.slug}`}
                      className={cardClassName}
                    >
                      {cardContent}
                    </Link>
                  ) : (
                    <div key={listing.id} className={cardClassName}>
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        checked ? "bg-brand/10 text-brand-dark" : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 rounded border-foreground/30 text-brand focus:ring-0"
      />
      {label}
    </label>
  );
}
