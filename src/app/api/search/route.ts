import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/voyage";
import { interpretQuery, summarizeResults, findExternalMatches, type ExternalMatch } from "@/lib/anthropic";
import { distanceKm } from "@/lib/geo";
import { findApartmentSector } from "@/lib/apartments";
import type { Category, MatchListingsRow, Sector } from "@/lib/supabase/types";

// Below this cosine similarity, a result is treated as "not actually a
// match" rather than just the least-bad of the bunch. Without this, the
// RPC always returns up to `match_count` rows ordered by distance — so a
// query with no real match in the directory (e.g. "skating classes" when
// there are none) would still surface the 12 closest listings (exam
// coaching, martial arts, ...) and present them as if they were relevant.
//
// Calibrated against real data: a "skate class for an 8 year old" search
// scored an unrelated tuition-coaching listing at 47% — so anything below
// 0.35 was never the problem. 0.55 is a deliberately conservative cut that
// clears that false positive with margin. If a genuinely relevant listing
// (once one exists) starts getting excluded, lower this; if unrelated
// results still slip through above 0.55, raise it further.
const MIN_SIMILARITY = 0.55;

// POST /api/search — natural-language search over listings.
//
// Flow:
//   1. Claude reads the raw query and pulls out a sector number / category
//      hint ("swimming classes near sector 10" -> sector: 10, category: Fitness).
//   2. Voyage embeds the (sector-stripped) query text.
//   3. Supabase's match_listings() RPC does a pgvector cosine-similarity
//      search over listing embeddings, pre-filtered by that sector/category
//      when Claude found one.
//   4. Claude writes a one-line natural-language intro to the results.
//
// This keeps exact filters (sector, category) reliable via structured
// extraction, while still using semantic search for everything fuzzy
// ("someone to fix a leaking tap" -> plumbers).
//
// Claude (steps 1 and 4) is optional and fails SOFT: if ANTHROPIC_API_KEY
// isn't set, OR a Claude call errors for any reason (billing, rate limit,
// an outage), search falls back to pure Voyage semantic search with no
// sector/category pre-filter and a simple result-count message instead of
// a written intro — the directory itself still works either way. Voyage
// embeddings are required — there's no fallback for those, since they're
// what actually matches the query against your listings.
export async function POST(request: Request) {
  const { query, sector } = await request.json();

  if (!query || typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: categoriesData }, { data: sectorsData }, { data: apartmentsData }] = await Promise.all([
    supabase.from("categories").select("*"),
    // Explicit is_active filter, not just RLS — if the person searching
    // happens to be signed in as the admin (same browser/cookies), the
    // "authenticated users manage sectors" policy would otherwise let this
    // query see inactive sectors too, letting search filter by a hidden one.
    // latitude/longitude power the distance-based re-rank below (optional
    // per sector, set from /admin/sectors — supabase/migrations/0005). name
    // is used only to phrase the web-search fallback below.
    supabase.from("sectors").select("id, name, latitude, longitude").eq("is_active", true),
    // Same explicit is_active filter as sectors, same reason. Used to spot
    // a named apartment/society in the query text (supabase/migrations/0007).
    supabase.from("apartments").select("name, sector_id").eq("is_active", true),
  ]);
  const categories = (categoriesData as Category[]) ?? [];
  // Listings only ever store a leaf (L2) category_id — filtering and Claude's
  // category-hint matching both need to work against subcategory names, not
  // the L1 top-level names.
  const subcategories = categories.filter((c) => c.level === 2);
  const activeSectors = (sectorsData as Pick<Sector, "id" | "name" | "latitude" | "longitude">[]) ?? [];
  const activeSectorIds = activeSectors.map((s) => s.id);
  const sectorCoordsById = new Map(
    activeSectors
      .filter((s) => s.latitude !== null && s.longitude !== null)
      .map((s) => [s.id, { lat: s.latitude as number, lng: s.longitude as number }]),
  );
  const sectorNameById = new Map(activeSectors.map((s) => [s.id, s.name]));

  // Starts true only if a key is configured, and flips to false the moment
  // any Claude call actually fails — so a billing/outage failure on the
  // first call (interpretQuery) skips the later ones (summarizeResults,
  // findExternalMatches) too, instead of retrying and failing each one.
  let claudeAvailable = Boolean(process.env.ANTHROPIC_API_KEY);

  try {
    let interpretation = { sector: null as number | null, categoryHint: null as string | null, cleanedQuery: query };
    if (claudeAvailable) {
      try {
        interpretation = await interpretQuery(query, subcategories.map((c) => c.name), activeSectorIds);
      } catch (err) {
        console.error("Claude interpretQuery failed — falling back to plain semantic search:", err);
        claudeAvailable = false;
      }
    }

    const matchedCategory = subcategories.find(
      (c) => c.name.toLowerCase() === interpretation.categoryHint?.toLowerCase(),
    );

    // An explicit sector picked in the search UI always wins over whatever
    // Claude guessed from the query text, which in turn wins over a plain
    // apartment-name match — the more specific/deliberate signal wins.
    const apartments = (apartmentsData as { name: string; sector_id: number }[]) ?? [];
    const apartmentSector = findApartmentSector(query, apartments);
    const effectiveSector = activeSectorIds.includes(sector)
      ? sector
      : (interpretation.sector ?? apartmentSector);

    const queryEmbedding = await embed(interpretation.cleanedQuery, "query");

    const { data: results, error } = await supabase.rpc("match_listings", {
      query_embedding: queryEmbedding,
      match_count: 12,
      filter_sector: effectiveSector,
      filter_category_id: matchedCategory?.id ?? null,
    });

    if (error) throw new Error(error.message);

    let rows = ((results as MatchListingsRow[]) ?? []).filter(
      (r) => r.similarity >= MIN_SIMILARITY,
    );

    // When the query names (or the UI picked) a sector, and that sector plus
    // at least the listings' own sectors have coordinates, prefer the
    // closer ones among these already-relevant results — "cricket academy
    // near sector 6" should show sector 5 before sector 18, not whatever
    // order ties in similarity happened to come back in.
    const originCoords = effectiveSector !== null ? sectorCoordsById.get(effectiveSector) : undefined;
    if (originCoords) {
      rows = [...rows].sort((a, b) => {
        const coordsA = sectorCoordsById.get(a.sector);
        const coordsB = sectorCoordsById.get(b.sector);
        const distA = coordsA ? distanceKm(originCoords.lat, originCoords.lng, coordsA.lat, coordsA.lng) : Infinity;
        const distB = coordsB ? distanceKm(originCoords.lat, originCoords.lng, coordsB.lat, coordsB.lng) : Infinity;
        if (distA !== distB) return distA - distB;
        return b.similarity - a.similarity;
      });
    }

    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const enriched = rows.map((r) => ({
      ...r,
      category: categoryById.get(r.category_id) ?? null,
    }));

    // Nothing in the directory itself — rather than a dead end, ask Claude
    // to search the web for real local businesses instead. Deliberately
    // separate from `enriched`: these are unverified, external, and never
    // silently blended into the directory's own results.
    let externalResults: ExternalMatch[] = [];
    if (enriched.length === 0 && claudeAvailable) {
      const sectorName = effectiveSector !== null ? (sectorNameById.get(effectiveSector) ?? null) : null;
      try {
        externalResults = await findExternalMatches(query, sectorName);
      } catch (err) {
        // Web search failing shouldn't fail the whole request — the visitor
        // still gets the (empty) directory answer below.
        console.error("Web search fallback failed:", err);
      }
    }

    let answer: string;
    if (claudeAvailable && enriched.length > 0) {
      try {
        answer = await summarizeResults(
          query,
          enriched.map((r) => ({
            name: r.name,
            category: r.category?.name ?? "Uncategorized",
            sector: r.sector,
          })),
        );
      } catch (err) {
        console.error("Claude summarizeResults failed — falling back to a plain message:", err);
        claudeAvailable = false;
        answer = `${enriched.length} result${enriched.length === 1 ? "" : "s"} for "${query}".`;
      }
    } else if (claudeAvailable && externalResults.length > 0) {
      answer = `Here's what's nearby for "${query}".`;
    } else if (enriched.length > 0) {
      answer = `${enriched.length} result${enriched.length === 1 ? "" : "s"} for "${query}".`;
    } else {
      answer = `No matches yet for "${query}" — the directory is still growing.`;
    }

    return NextResponse.json({ answer, results: enriched, externalResults, interpretation });
  } catch (err) {
    console.error("Search failed:", err);
    return NextResponse.json(
      { error: "Search is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
