"use server";

// Server Actions for the admin-only stats page. Same auth model as the
// rest of /admin: no explicit redirect guard here — reads go through the
// signed-in admin's Supabase session, and RLS ("authenticated users read
// search logs" / equivalent on listing_click_events) is what actually
// keeps this data admin-only. An unauthenticated visitor hitting this
// route gets empty results, not an error, the same way the other admin
// pages behave.
//
// search_logs (supabase/migrations/0013_search_logs.sql) and the "view"
// action + source_page/session_id columns on listing_click_events
// (supabase/migrations/0012_extend_listing_events.sql) are both proposed
// migrations awaiting approval — until they're run, these queries return
// empty/partial data rather than erroring (Supabase returns an error for
// a query against a table/column that doesn't exist yet, caught below and
// treated as "no data").
import { createClient } from "@/lib/supabase/server";
import type { Category, Listing, ListingClickEvent, SearchLog } from "@/lib/supabase/types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Caps on how much raw history a single stats-page load will pull and
// aggregate in JS. Fine at the directory's current scale; if either table
// grows large enough for this to matter, move the aggregation into a
// Postgres view/RPC instead of raising these.
const SEARCH_LOG_WINDOW_DAYS = 30;
const SEARCH_LOG_ROW_CAP = 5000;
const CLICK_EVENT_ROW_CAP = 20000;

export type SearchWindowStats = {
  totalSearches: number;
  zeroResultCount: number;
  zeroResultRate: number; // 0..1
};

export type WeakQuery = {
  query: string;
  count: number;
  zeroResultCount: number;
};

export type SearchStats = {
  last7Days: SearchWindowStats;
  last30Days: SearchWindowStats;
  topWeakQueries: WeakQuery[]; // last 30 days, zero or low-result queries
};

export async function getSearchStats(): Promise<SearchStats> {
  const empty: SearchStats = {
    last7Days: { totalSearches: 0, zeroResultCount: 0, zeroResultRate: 0 },
    last30Days: { totalSearches: 0, zeroResultCount: 0, zeroResultRate: 0 },
    topWeakQueries: [],
  };

  const supabase = await createClient();
  const since = new Date(Date.now() - SEARCH_LOG_WINDOW_DAYS * DAY_MS).toISOString();

  const { data, error } = await supabase
    .from("search_logs")
    .select("query, result_count, zero_results, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(SEARCH_LOG_ROW_CAP);

  if (error) {
    // Expected until 0013_search_logs.sql is approved and run.
    console.error("getSearchStats failed:", error.message);
    return empty;
  }

  const rows = (data ?? []) as Pick<SearchLog, "query" | "result_count" | "zero_results" | "created_at">[];
  const now = Date.now();
  const cutoff7 = now - 7 * DAY_MS;

  function windowStats(cutoff: number): SearchWindowStats {
    const inWindow = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
    const zeroResultCount = inWindow.filter((r) => r.zero_results).length;
    return {
      totalSearches: inWindow.length,
      zeroResultCount,
      zeroResultRate: inWindow.length > 0 ? zeroResultCount / inWindow.length : 0,
    };
  }

  // "Weak" = zero results, or so few results the query is probably still
  // underserved by the directory.
  const WEAK_RESULT_THRESHOLD = 1;
  const weakByQuery = new Map<string, WeakQuery>();
  for (const r of rows) {
    if (!r.zero_results && r.result_count > WEAK_RESULT_THRESHOLD) continue;
    const key = r.query.trim().toLowerCase();
    if (!key) continue;
    const existing = weakByQuery.get(key);
    if (existing) {
      existing.count += 1;
      if (r.zero_results) existing.zeroResultCount += 1;
    } else {
      weakByQuery.set(key, { query: r.query.trim(), count: 1, zeroResultCount: r.zero_results ? 1 : 0 });
    }
  }
  const topWeakQueries = [...weakByQuery.values()].sort((a, b) => b.count - a.count).slice(0, 20);

  return {
    last7Days: windowStats(cutoff7),
    last30Days: windowStats(new Date(since).getTime()),
    topWeakQueries,
  };
}

export type ListingStatsRow = {
  listingId: string;
  name: string;
  category: string;
  sector: number;
  views: number;
  calls: number;
  whatsapp: number;
  directions: number;
};

export type CategorySectorTotals = {
  byCategory: { category: string; total: number }[];
  bySector: { sector: number; total: number }[];
};

export async function getListingStats(): Promise<{
  rows: ListingStatsRow[];
  totals: CategorySectorTotals;
}> {
  const empty = { rows: [], totals: { byCategory: [], bySector: [] } };

  const supabase = await createClient();
  const [{ data: events, error: eventsError }, { data: listingsData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("listing_click_events")
      .select("listing_id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(CLICK_EVENT_ROW_CAP),
    supabase.from("listings").select("id, name, category_id, sector"),
    supabase.from("categories").select("*"),
  ]);

  if (eventsError) {
    // Expected until 0012_extend_listing_events.sql is approved and run
    // (the "view" action doesn't exist as an allowed value yet).
    console.error("getListingStats failed:", eventsError.message);
    return empty;
  }

  const listings = (listingsData as Pick<Listing, "id" | "name" | "category_id" | "sector">[]) ?? [];
  const categories = (categoriesData as Category[]) ?? [];
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const eventRows = (events ?? []) as Pick<ListingClickEvent, "listing_id" | "action">[];

  const countsByListing = new Map<string, { views: number; calls: number; whatsapp: number; directions: number }>();
  for (const e of eventRows) {
    const bucket = countsByListing.get(e.listing_id) ?? { views: 0, calls: 0, whatsapp: 0, directions: 0 };
    if (e.action === "view") bucket.views += 1;
    else if (e.action === "call") bucket.calls += 1;
    else if (e.action === "whatsapp") bucket.whatsapp += 1;
    else if (e.action === "directions") bucket.directions += 1;
    countsByListing.set(e.listing_id, bucket);
  }

  const rows: ListingStatsRow[] = listings.map((l) => {
    const counts = countsByListing.get(l.id) ?? { views: 0, calls: 0, whatsapp: 0, directions: 0 };
    return {
      listingId: l.id,
      name: l.name,
      category: categoryById.get(l.category_id)?.name ?? "Uncategorized",
      sector: l.sector,
      ...counts,
    };
  });

  const byCategoryMap = new Map<string, number>();
  const bySectorMap = new Map<number, number>();
  for (const r of rows) {
    const total = r.views + r.calls + r.whatsapp + r.directions;
    byCategoryMap.set(r.category, (byCategoryMap.get(r.category) ?? 0) + total);
    bySectorMap.set(r.sector, (bySectorMap.get(r.sector) ?? 0) + total);
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const bySector = [...bySectorMap.entries()]
    .map(([sector, total]) => ({ sector, total }))
    .sort((a, b) => b.total - a.total);

  return { rows, totals: { byCategory, bySector } };
}
