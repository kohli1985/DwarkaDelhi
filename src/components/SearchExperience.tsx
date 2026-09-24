"use client";

import { useEffect, useState } from "react";
import type { MatchListingsRow, Category } from "@/lib/supabase/types";

type SearchResult = MatchListingsRow & { category: Category | null };

// From src/lib/anthropic.ts's findExternalMatches — web-search fallback
// results, shown only when the directory itself has zero matches. Kept in
// a visually distinct section so it's never mistaken for a vetted listing.
type ExternalMatch = {
  name: string;
  description: string;
  address: string | null;
  phone: string | null;
  sourceUrl: string;
};

const EXAMPLE_QUERIES = [
  "swimming classes near sector 10",
  "someone to fix a leaking tap",
  "dentist in sector 6",
  "good breakfast place in sector 5",
];

// Sector is controlled by the caller (home page passes null/null; a
// /sector/[id] page passes that sector's id/name fixed) — no in-component
// picker or localStorage persistence here.
export default function SearchExperience({
  sectorId,
  sectorName,
}: {
  sectorId: number | null;
  sectorName: string | null;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  // A search is usually a couple of seconds, but can run longer (the web
  // fallback in particular does real web searches). Rather than leave the
  // button's "Searching…" as the only sign of life, escalate to a second
  // line after a few seconds so a slow search still reads as "working",
  // not "stuck".
  const [showLongWait, setShowLongWait] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setShowLongWait(true), 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setShowLongWait(false);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, sector: sectorId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Search failed");

      setAnswer(data.answer);
      setResults(data.results ?? []);
      setExternalResults(data.externalResults ?? []);
    } catch (err) {
      // Show whatever the server actually said (e.g. "Search is
      // temporarily unavailable" from a real backend error) instead of
      // always guessing it's a missing-API-key problem — that generic
      // message used to show for every failure, which made real errors
      // (a billing issue, a DB error) look identical to "never configured".
      console.error("Search request failed:", err);
      const message = err instanceof Error ? err.message : "";
      setError(
        message && message !== "Search failed"
          ? message
          : "Couldn't reach search right now — check the browser console and server terminal for details.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Resets the whole search back to its pre-search state — not just the
  // text box — so clearing feels like a real "start over," not just an
  // empty input with stale results still showing below it.
  function clearSearch() {
    setQuery("");
    setAnswer(null);
    setResults([]);
    setExternalResults([]);
    setError(null);
    setHasSearched(false);
  }

  // A browser reload always remounts this component fresh, but returning
  // via back/forward can restore the page from bfcache instead — old
  // query and results still on screen even though the visitor expects a
  // clean slate. `pageshow` with `event.persisted` is the standard signal
  // for exactly that case.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) clearSearch();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <section id="search" className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">
            Ask DelhiDwarka
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Find what you need, in plain words
          </h2>
          {sectorName && (
            <p className="mt-2 text-sm font-medium text-brand-dark">
              Searching in {sectorName} only
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “swimming classes near sector 10”"
              autoComplete="off"
              className="w-full rounded-full border border-foreground/15 bg-background px-5 py-3 pr-11 text-base text-foreground outline-none focus:border-brand"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                runSearch(example);
              }}
              className="rounded-full border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 transition-colors hover:border-brand/30 hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        {loading && (
          <div className="mt-10" aria-live="polite" aria-busy="true">
            <p className="text-center text-sm text-foreground/50">
              {showLongWait
                ? "Still searching — checking a few more sources for the best match…"
                : "Searching…"}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5"
                >
                  <div className="h-4 w-2/3 rounded bg-foreground/10" />
                  <div className="mt-3 h-3 w-full rounded bg-foreground/10" />
                  <div className="mt-2 h-3 w-5/6 rounded bg-foreground/10" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!error && hasSearched && !loading && (
          <div className="mt-10">
            <div className="flex items-center justify-between gap-3">
              {answer && <p className="text-base text-foreground/80">{answer}</p>}
              <button
                type="button"
                onClick={clearSearch}
                className="shrink-0 text-xs font-medium text-foreground/50 hover:text-foreground"
              >
                Clear results
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{r.name}</h3>
                      <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-foreground/50">
                        <span>Sector {r.sector}</span>
                        {/* Temporary debug badge while tuning MIN_SIMILARITY in
                            api/search/route.ts — remove once the threshold is settled. */}
                        <span className="font-mono text-[10px] text-foreground/35">
                          {Math.round(r.similarity * 100)}% match
                        </span>
                      </span>
                    </div>
                    {r.category && (
                      <span className="mt-1 inline-block text-xs font-medium text-brand-dark">
                        {r.category.emoji} {r.category.name}
                      </span>
                    )}
                    <p className="mt-2 text-sm leading-6 text-foreground/65">
                      {r.description}
                    </p>
                    {(r.phone || r.address) && (
                      <p className="mt-3 text-xs text-foreground/50">
                        {r.address}
                        {r.address && r.phone && " · "}
                        {r.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Web-search fallback — only shown when the directory itself has
                nothing. Kept as a distinct, unlinked list (not blended into
                `results` above) so we never present it as a directly vetted
                DelhiDwarka listing — but the label/card styling here is
                deliberately understated rather than a loud "unverified"
                warning, per product call: visitors don't need the sourcing
                mechanics, just a lightweight "more options" framing. */}
            {externalResults.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  More options nearby
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {externalResults.map((r, i) => (
                    <a
                      key={i}
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-foreground/10 bg-background p-5 transition-colors hover:border-brand/40"
                    >
                      <h3 className="font-semibold text-foreground">{r.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-foreground/65">{r.description}</p>
                      {(r.phone || r.address) && (
                        <p className="mt-3 text-xs text-foreground/50">
                          {r.address}
                          {r.address && r.phone && " · "}
                          {r.phone}
                        </p>
                      )}
                      <span className="mt-3 inline-block text-xs font-medium text-brand-dark">
                        View source ↗
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
