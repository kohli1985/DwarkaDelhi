-- DelhiDwarka: click tracking for the listing detail page's Call/WhatsApp/
-- Directions buttons (src/components/ListingActionButtons.tsx).
--
-- Same shape/RLS pattern as contact_submissions (0004_contact_submissions.sql):
-- anyone (including anonymous visitors) can log a click — that's what lets
-- the public listing page record one — but only the signed-in admin can
-- read them back. `created_at` is used as the "timestamp" column, matching
-- every other table's naming convention.
create table if not exists listing_click_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  action text not null check (action in ('call', 'whatsapp', 'directions')),
  created_at timestamptz not null default now()
);

create index if not exists listing_click_events_listing_idx
  on listing_click_events(listing_id);
create index if not exists listing_click_events_created_at_idx
  on listing_click_events(created_at desc);

alter table listing_click_events enable row level security;

-- anyone, including anonymous visitors, can log a click event
create policy "anyone can log a listing click event"
  on listing_click_events for insert
  with check (true);

-- only the signed-in admin can read click events (e.g. to show a business
-- how many enquiries their listing gets) — no public select policy, same
-- as contact_submissions
create policy "authenticated users read listing click events"
  on listing_click_events for select
  using (auth.role() = 'authenticated');
