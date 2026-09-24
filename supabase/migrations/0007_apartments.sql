-- DelhiDwarka: named apartments/societies within a sector, for search.
--
-- A lot of real queries name a landmark instead of a sector number —
-- "leaking tap near Sai CGHS", "electrician in Vardhman Apartments" — and
-- right now those get zero location boost: the distance re-ranking in
-- src/app/api/search/route.ts only kicks in when a sector number is picked
-- or extracted from the text. This table lets the admin record which
-- sector an apartment/society sits in, so a query naming it can borrow that
-- sector's coordinates for the same "near me" ranking sectors already get
-- (see supabase/migrations/0005_sector_coordinates.sql).
--
-- Matching a query against this table happens in the app (plain
-- case-insensitive substring match against the raw query text — see
-- src/lib/apartments.ts), not via an extra Claude call: apartment names are
-- proper nouns from a known list, so exact lookup is both cheaper and more
-- reliable than asking a model to extract one.
create table if not exists apartments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector_id smallint not null references sectors(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Case-insensitive: "Sai CGHS" and "sai cghs" are the same apartment, so
-- adding it twice (once from the admin form, once from a bulk CSV) fails
-- loudly instead of creating a silent duplicate.
create unique index if not exists apartments_name_sector_unique
  on apartments (lower(name), sector_id);

-- Read-heavy: search hits this on every request that doesn't already have
-- an explicit sector, so an index on the lowercased name keeps that cheap
-- even once the list is a few hundred rows long.
create index if not exists apartments_name_lower_idx on apartments (lower(name));

alter table apartments enable row level security;

create policy "active apartments are publicly readable"
  on apartments for select
  using (is_active = true);

create policy "authenticated users manage apartments"
  on apartments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
