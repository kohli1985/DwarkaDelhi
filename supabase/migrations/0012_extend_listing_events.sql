-- DelhiDwarka: extends listing_click_events (0010_listing_click_events.sql)
-- to cover page views too, not just Call/WhatsApp/Directions clicks — the
-- task asked for a "listing_events: listing_id, action (view | call |
-- whatsapp | directions), source_page, created_at" table; this reuses the
-- existing one rather than creating a parallel table with the same shape,
-- since 0010 already has real click data in it.
--
-- Adds:
--   - 'view' as a fourth allowed `action` value
--   - source_page: which page logged the event (e.g. "listing_detail") —
--     free text rather than an enum, so a new source page later doesn't
--     need its own migration
--   - session_id: the short-lived anonymous cookie value from
--     src/lib/analytics.ts, used ONLY to dedupe a rapid double-fire of the
--     same listing+action within 30 seconds (src/app/listing/actions.ts)
--     — not a user identifier, not linked to anything else, and not
--     readable by the public (see the RLS policies below).
--
-- NOT RUN AUTOMATICALLY. Review and run yourself from the Supabase SQL
-- editor when ready — src/app/listing/actions.ts already calls this
-- shape; until this runs, its inserts fail harmlessly (caught and logged,
-- never surfaced to a visitor) because the 'view' action and these
-- columns don't exist yet.

alter table listing_click_events
  add column if not exists source_page text,
  add column if not exists session_id text;

-- The original CHECK on `action` was defined inline in CREATE TABLE with
-- no explicit name, so Postgres auto-named it <table>_<column>_check.
-- Verify with \d listing_click_events in the SQL editor first if you want
-- to be sure before running this — DROP CONSTRAINT IF EXISTS is a no-op
-- rather than an error if the name doesn't match, but the ADD CONSTRAINT
-- below would then fail if the old, narrower constraint is still in place
-- alongside it.
alter table listing_click_events drop constraint if exists listing_click_events_action_check;
alter table listing_click_events
  add constraint listing_click_events_action_check
  check (action in ('view', 'call', 'whatsapp', 'directions'));

-- Speeds up the dedupe check (same listing + action + session within the
-- last 30 seconds) that runs on every insert.
create index if not exists listing_click_events_dedupe_idx
  on listing_click_events(listing_id, action, session_id, created_at desc);

-- RLS policies from 0010 already cover this: public can insert, only the
-- signed-in admin can select. No changes needed there — session_id being
-- readable by the admin is fine (it's an anonymous per-visit token, not a
-- user identifier) and still isn't readable by the public.
