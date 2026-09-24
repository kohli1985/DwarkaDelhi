-- DelhiDwarka: sectors as a managed table instead of a hardcoded list.
--
-- Sectors used to be a fixed array (4, 5, 6, 10, 12) baked into the code
-- (SECTORS in src/lib/supabase/types.ts) and enforced via a CHECK constraint
-- on listings.sector. Adding a new sector meant a code change + redeploy.
--
-- This migration makes sectors a real table the admin manages from
-- /admin/sectors: add sectors (one at a time or in bulk), toggle whether a
-- sector is publicly visible (is_active), and delete unused ones. The old
-- CHECK constraint is replaced with a foreign key to this table.

create table if not exists sectors (
  id smallint primary key,        -- the sector number, e.g. 4, 7, 10
  name text not null,             -- display name, e.g. "Sector 7"
  is_active boolean not null default true,  -- whether it's shown publicly
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table sectors enable row level security;

-- public (anon) can see only active/visible sectors
create policy "active sectors are publicly readable"
  on sectors for select
  using (is_active = true);

-- signed-in admin can see and manage all sectors, active or not
create policy "authenticated users manage sectors"
  on sectors for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- seed with the sectors already in use so existing listings keep working
insert into sectors (id, name, sort_order) values
  (4, 'Sector 4', 1),
  (5, 'Sector 5', 2),
  (6, 'Sector 6', 3),
  (10, 'Sector 10', 4),
  (12, 'Sector 12', 5)
on conflict (id) do nothing;

-- swap the old hardcoded CHECK constraint on listings.sector for a real FK
-- against the new table. ON DELETE RESTRICT means a sector with listings
-- attached can't be deleted (the app also pre-checks this for a friendlier
-- error message — see bulkDeleteSectors in src/app/admin/sectors/actions.ts).
alter table listings drop constraint if exists listings_sector_check;
alter table listings
  add constraint listings_sector_fkey
  foreign key (sector) references sectors(id) on delete restrict;
