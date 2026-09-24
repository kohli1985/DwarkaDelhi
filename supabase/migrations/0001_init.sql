-- DelhiDwarka: initial schema
-- Sector-scoped local services directory for Dwarka, Delhi (sectors 4, 5, 6, 10, 12)

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  emoji text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),

  -- core info
  name text not null,
  category_id uuid not null references categories(id) on delete restrict,
  description text not null default '',

  -- location — constrained to the sectors DelhiDwarka currently covers
  sector int not null check (sector in (4, 5, 6, 10, 12)),
  address text,
  landmark text,

  -- contact
  phone text,
  whatsapp text,
  website text,
  instagram text,

  -- operating info
  hours_text text,               -- free-form for v1, e.g. "Mon-Sat 9am-8pm"
  price_range text,               -- free-form for v1, e.g. "₹500-1500/session"

  -- search
  search_text text generated always as (
    name || ' ' || coalesce(description, '') || ' ' || coalesce(address, '') || ' ' || coalesce(landmark, '')
  ) stored,
  embedding vector(1024),          -- voyage-3 embedding of search_text

  -- moderation / visibility
  is_published boolean not null default true,
  featured boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_category_idx on listings(category_id);
create index if not exists listings_sector_idx on listings(sector);
create index if not exists listings_published_idx on listings(is_published);

-- vector similarity index (cosine distance) — created after some rows exist ideally,
-- but safe to create now for a fresh table
create index if not exists listings_embedding_idx
  on listings using hnsw (embedding vector_cosine_ops);

-- keep updated_at fresh
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on listings;
create trigger listings_set_updated_at
  before update on listings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- semantic search RPC — cosine similarity over published listings,
-- optionally filtered by sector/category
-- ---------------------------------------------------------------------------
create or replace function match_listings(
  query_embedding vector(1024),
  match_count int default 10,
  filter_sector int default null,
  filter_category_id uuid default null
)
returns table (
  id uuid,
  name text,
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
    l.id, l.name, l.category_id, l.description, l.sector, l.address,
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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table categories enable row level security;
alter table listings enable row level security;

-- public can read categories
create policy "categories are publicly readable"
  on categories for select
  using (true);

-- public can read only published listings
create policy "published listings are publicly readable"
  on listings for select
  using (is_published = true);

-- authenticated users (admins — this app has no self-serve signup) can do everything
create policy "authenticated users manage categories"
  on categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "authenticated users manage listings"
  on listings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- seed categories
-- ---------------------------------------------------------------------------
insert into categories (slug, name, emoji, sort_order) values
  ('food-dining', 'Food & Dining', '🍽️', 1),
  ('fitness-sports', 'Fitness & Sports', '🏊', 2),
  ('classes-tuitions', 'Classes & Tuitions', '📚', 3),
  ('health-wellness', 'Health & Wellness', '🩺', 4),
  ('home-services', 'Home Services', '🔧', 5),
  ('salon-grooming', 'Salon & Grooming', '💈', 6),
  ('retail-shopping', 'Retail & Shopping', '🛍️', 7),
  ('events-vendors', 'Events & Vendors', '🎉', 8)
on conflict (slug) do nothing;
