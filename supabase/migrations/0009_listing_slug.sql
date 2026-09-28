-- DelhiDwarka: URL slug for each listing, backing the new /listing/[slug]
-- detail page (e.g. "clove-dental-clinic-sector-10").
--
-- Nullable for now: existing rows need a backfill, which this migration
-- can't do itself (no live-data access from where this was written) — run
-- scripts/backfill-listing-slugs.mjs yourself after applying this, then
-- optionally tighten the column with:
--   alter table listings alter column slug set not null;
-- once `select count(*) from listings where slug is null;` is 0.
--
-- New/edited listings from the admin already get a slug going forward
-- (src/lib/slug.ts, wired into createListing and bulkCreateListings) —
-- this only affects listings that already existed before this migration.
alter table listings add column if not exists slug text;

-- Partial unique index (only enforces uniqueness among non-null slugs) —
-- can't be a plain unique constraint yet since existing rows are null
-- until backfilled.
create unique index if not exists listings_slug_unique_idx
  on listings(slug) where slug is not null;

-- match_listings (search results) now also returns slug, so search result
-- cards can link straight to a listing's detail page instead of just
-- showing it inline. Postgres won't let `create or replace` change a
-- function's RETURNS TABLE columns (error 42P13) — the old signature has
-- to be dropped first.
drop function if exists match_listings(vector, integer, integer, uuid);

create or replace function match_listings(
  query_embedding vector(1024),
  match_count int default 10,
  filter_sector int default null,
  filter_category_id uuid default null
)
returns table (
  id uuid,
  name text,
  slug text,
  category_id uuid,
  description text,
  sector int,
  address text,
  landmark text,
  phone text,
  whatsapp text,
  website text,
  hours_text text,
  price_range text,
  similarity float
)
language sql stable as $$
  select
    l.id, l.name, l.slug, l.category_id, l.description, l.sector, l.address,
    l.landmark, l.phone, l.whatsapp, l.website, l.hours_text, l.price_range,
    1 - (l.embedding <=> query_embedding) as similarity
  from listings l
  where l.is_published = true
    and l.embedding is not null
    and (filter_sector is null or l.sector = filter_sector)
    and (filter_category_id is null or l.category_id = filter_category_id)
  order by l.embedding <=> query_embedding
  limit match_count;
$$;
