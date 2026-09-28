-- DelhiDwarka: anonymous search-query logging, used by the admin stats
-- page (/admin/stats) to see what people are searching for and how often
-- the directory comes up empty. No IPs, no user agents, no identifiers —
-- just the query text, the sector filter (if any), and the outcome.
--
-- NOT RUN AUTOMATICALLY. Review and run yourself from the Supabase SQL
-- editor when ready — src/app/api/search/route.ts already logs to this
-- shape after every search; until this runs, that insert fails harmlessly
-- (caught and logged server-side, never surfaced to the visitor or
-- allowed to affect the search response).

create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  -- The sector filter actually applied to the search (UI-selected sector,
  -- or one Claude/an apartment match inferred from the query text — see
  -- `effectiveSector` in src/app/api/search/route.ts), not necessarily
  -- what the visitor typed. Null when no sector applied. ON DELETE SET
  -- NULL rather than a hard FK failure if a sector is ever deleted later.
  sector_filter int references sectors(id) on delete set null,
  result_count int not null default 0,
  -- Highest cosine-similarity score among the raw candidates, before the
  -- MIN_SIMILARITY cutoff filters them down to result_count — useful for
  -- telling "no listing exists for this" apart from "one probably does,
  -- but scored just under the threshold" when reviewing zero-result
  -- queries. Null if there were no candidates at all.
  top_score real,
  zero_results boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists search_logs_created_at_idx on search_logs(created_at desc);
create index if not exists search_logs_zero_results_idx on search_logs(zero_results, created_at desc);

alter table search_logs enable row level security;

-- Anyone can log a search (the search API route runs with the visitor's
-- own anon session, same pattern as listing_click_events/contact_submissions).
create policy "anyone can log a search"
  on search_logs for insert
  with check (true);

-- Only the signed-in admin can read search logs.
create policy "authenticated users read search logs"
  on search_logs for select
  using (auth.role() = 'authenticated');
