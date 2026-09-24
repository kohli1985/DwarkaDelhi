-- DelhiDwarka: sector coordinates, for "near me / near this sector" ranking.
--
-- Search results within a sector-scoped query (e.g. "cricket academy near
-- sector 6") currently tie-break arbitrarily once relevance is similar —
-- sector 18 can show above sector 5 even though 5 is obviously closer to 6.
-- Adding a lat/lng per sector lets the search API rank same-relevance
-- results by actual distance from the searched sector.
--
-- Nullable and optional: a sector with no coordinates set just keeps its
-- existing similarity-only ordering. Fill these in from /admin/sectors —
-- e.g. from Google Maps, right-click a point in the sector -> the lat/lng
-- shown at the top of the context menu.
alter table sectors
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
