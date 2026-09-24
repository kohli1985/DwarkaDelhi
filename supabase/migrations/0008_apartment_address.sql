-- DelhiDwarka: optional full address for each apartment/society.
--
-- The sector already places an apartment roughly (for the distance-ranking
-- boost in src/app/api/search/route.ts) — this adds the actual street
-- address so the admin has somewhere to record it, and it's available to
-- show alongside an apartment if it's ever surfaced directly.
alter table apartments
  add column if not exists address text;
