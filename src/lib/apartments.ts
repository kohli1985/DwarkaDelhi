// Matches a search query against the known apartments/societies list, to
// find which sector a query is really about when it names a landmark
// instead of a sector number — "leaking tap near Sai CGHS" should rank
// results the same way "leaking tap near sector 6" does (see
// src/app/api/search/route.ts and supabase/migrations/0007_apartments.sql).
//
// Deliberately plain string matching rather than another Claude call:
// apartment names are proper nouns from a known, admin-curated list, so an
// exact (case-insensitive) substring match is both cheaper and more
// reliable here than asking a model to extract one.
export type ApartmentLookup = { name: string; sector_id: number };

// Longest name first, so "Sai CGHS Phase 2" matches before the shorter
// "Sai CGHS" would, if both happened to exist.
export function findApartmentSector(
  query: string,
  apartments: ApartmentLookup[],
): number | null {
  const q = query.toLowerCase();
  const sorted = [...apartments].sort((a, b) => b.name.length - a.name.length);
  for (const apartment of sorted) {
    const name = apartment.name.trim().toLowerCase();
    if (name.length >= 3 && q.includes(name)) {
      return apartment.sector_id;
    }
  }
  return null;
}
