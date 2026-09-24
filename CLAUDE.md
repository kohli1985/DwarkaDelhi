# CLAUDE.md

This file gives Claude (or any future contributor) full context on the
DelhiDwarka project before making changes.

## What this project is

**DelhiDwarka** is an AI-searchable local-services directory for five
commercial sectors of Dwarka, West Delhi: **Sectors 4, 5, 6, 10, and 12**
(deliberately narrow scope — these are Dwarka's commercial hubs, not the
whole sub-city). It's a side project by Gaurav, a Staff/Lead Product
Manager with a background in digital commerce, omnichannel retail, and
quick commerce.

**The problem it solves**: residents currently find local services
(swimming classes, dentists, tutors, repairs, restaurants) through
scattered Google searches, WhatsApp groups, or word of mouth — nothing
sector-specific or centralized exists. DelhiDwarka centralizes listings
and lets people search in plain language ("swimming classes near sector
10") instead of browsing categories or guessing keywords.

**Product shape**: a public marketing/search homepage + a single-admin
CMS (Gaurav manages all listings himself — no self-serve business-owner
accounts, at least for v1).

## Tech stack

- **Next.js 16** (App Router, Turbopack — stable/default in v16)
- **React 19**, **TypeScript**
- **Tailwind CSS v4** (CSS-first config via `@theme inline` in
  `src/app/globals.css` — no `tailwind.config.ts`)
- **Supabase** — Postgres database, Auth (admin login), Row Level Security
  - Project: `https://lzndljhymdikayoqckhp.supabase.co`
  - `pgvector` extension for embedding-based semantic search
- **Voyage AI** (`voyage-3.5-lite`, 1024-dim) — embeds listings and search
  queries for semantic search. Anthropic's recommended embeddings partner;
  Claude itself has no embeddings endpoint.
- **Anthropic Claude API** (`claude-sonnet-5`) — used in the search flow to
  (a) extract a sector number / category hint from a free-text query, and
  (b) write a one-line natural-language intro to search results.

### This is Next.js 16 — check `node_modules/next/dist/docs/` before big changes

Next 16 has breaking changes vs. earlier versions. Notably: **the
`middleware.ts` convention is renamed to `proxy.ts`** (function name
`proxy` instead of `middleware`) — this project already uses the new
`src/proxy.ts` convention; don't reintroduce `middleware.ts`.

### Fonts: no Google Fonts

This was built on a device with restricted outbound network access
(fonts.googleapis.com unreachable during build), so `next/font/google` was
removed in favor of a system font stack in `src/app/globals.css`. If
reintroducing a custom webfont, self-host with `next/font/local`.

### A note on `npm install` and this dev machine

This project was scaffolded and partly developed through a cloud sandbox
(Linux, arm64) that has file access to this Mac folder but is **not** this
Mac. Running `npm install` from that sandbox installs Linux-native binaries
(e.g. `lightningcss-linux-*`) into `node_modules`, which then breaks with
"Cannot find module '../lightningcss.darwin-arm64.node'" when run for real
on this Mac. **Always run `npm install` for this project from an actual
terminal on this Mac**, not from an external agent's sandboxed shell. If
you hit a native-binary error, the fix is: `rm -rf node_modules
package-lock.json && npm install --legacy-peer-deps` run directly on this
Mac. (`--legacy-peer-deps` works around an npm ERESOLVE quirk between
Next 16.3.5's peer range and the exact React 19.2.8 patch version.)

## Environment variables

See `.env.local.example` for the full list. Copy it to `.env.local`
(git-ignored) and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings (already set in the example file) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key (server-only, never expose client-side) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `VOYAGE_API_KEY` | dash.voyageai.com → API Keys |

## Category taxonomy (2-level: L1 -> L2)

As of `supabase/migrations/0002_category_hierarchy.sql`, `categories` is a
self-referencing hierarchy, not a flat list:

- `level`: `1` for a top-level category (e.g. "Food & Dining"), `2` for a
  subcategory (e.g. "Restaurants").
- `parent_id`: null for L1; the parent L1's id for L2.
- **Listings always store an L2 (leaf) `category_id`** — enforced by a DB
  trigger (`listings_category_is_leaf`) that rejects inserting/updating a
  listing with an L1 category_id. L1 exists only for grouping/browsing.
- `groupCategories()` in `src/lib/supabase/types.ts` turns the flat
  categories array into `{ top, children }[]` — used by the admin category
  picker and the homepage browse UI so both don't reimplement the grouping.
- The taxonomy (13 L1s, ~99 L2s) came from Gaurav's own category master
  list, not invented — see the migration file for the full list and where
  each subcategory sits. **This migration wipes existing listings and
  categories** (`truncate table listings; delete from categories;`) before
  reseeding — it was written when only test data existed. If you're
  applying schema changes after real listings exist, don't reuse this
  wipe-and-reseed pattern without checking with Gaurav first.
- Some subcategory names repeat under different L1s (e.g. "Insurance"
  under both "Finance" and "Professional & Business Services") — anything
  matching a subcategory by name alone must also know its parent L1 to
  disambiguate (see bulk upload and `interpretQuery` below).

## Database schema

`supabase/migrations/0001_init.sql` is the source of truth. Run it in the
Supabase SQL Editor (dashboard → SQL Editor → paste → Run) to set up the
project. It creates:

- **`categories`** — Food & Dining, Fitness & Sports, Classes & Tuitions,
  Health & Wellness, Home Services, Salon & Grooming, Retail & Shopping,
  Events & Vendors (seeded by the migration).
- **`listings`** — name, category, `sector` (constrained via `CHECK` to
  4/5/6/10/12 only), description, address/landmark, contact fields
  (phone/whatsapp/website/instagram), `hours_text`, `price_range`,
  `is_published`, `featured`, and an `embedding vector(1024)` column
  populated by the app on create/update (not by a DB trigger — see
  `src/app/admin/actions.ts`).
- **`match_listings()`** — a Postgres RPC doing cosine-similarity search
  over `listings.embedding`, with optional `filter_sector` /
  `filter_category_id`. Called from `src/app/api/search/route.ts`.
- **Row Level Security**: public (anon) can `SELECT` published listings
  and all categories; only `authenticated` users (i.e. the logged-in admin)
  can insert/update/delete. There's no self-serve signup — admin users are
  created manually in the Supabase dashboard (Authentication → Users → Add
  user), not through an app signup flow.

If the schema changes, regenerate `src/lib/supabase/types.ts`'s hand-written
types to match (or `npx supabase gen types typescript --project-id <ref>`
if the Supabase CLI is set up — it isn't yet).

**Type-safety note**: the Supabase client wrappers (`src/lib/supabase/
client.ts` / `server.ts` / `admin.ts`) currently create clients *without*
the generic `Database` type parameter (i.e. typed as `any` internally),
because passing it caused the TS compiler to collapse table Row/Insert
types to `never` in this environment (worth revisiting — likely a
`@supabase/postgrest-js` version/structural-typing quirk, not a real
schema mismatch; `src/lib/supabase/types.ts` still exports hand-written
`Listing`/`Category`/etc. types used for manual casts like `as Listing[]`
throughout the admin pages and search route).

## Project structure

```
src/
  app/
    layout.tsx, page.tsx, globals.css   # public homepage
    admin/
      login/page.tsx                     # Supabase Auth email/password sign-in
      layout.tsx                          # admin shell (nav, sign-out)
      page.tsx                             # listings table (dashboard)
      actions.ts                            # Server Actions: create/update/delete listing, sign out
      ListingForm.tsx                        # shared form used by new + edit pages
      DeleteListingButton.tsx                 # client component, confirm + delete
      listings/new/page.tsx                    # create form
      listings/[id]/edit/page.tsx               # edit form
    api/search/route.ts                # POST — LLM-interpreted + embedding search
  components/
    Header.tsx, Hero.tsx, About.tsx, Services.tsx, Footer.tsx
    SearchExperience.tsx               # client component: search box + results, on homepage
  lib/
    supabase/
      client.ts     # browser client (anon key)
      server.ts     # server client (anon key + cookies, respects RLS/session)
      admin.ts       # service-role client (bypasses RLS — for scripts, not currently used at runtime)
      types.ts        # hand-written DB types + SECTORS constant
    voyage.ts        # embed() — Voyage AI embeddings (document vs. query input_type)
    anthropic.ts      # interpretQuery() + summarizeResults() — Claude calls for search
  proxy.ts            # Next.js 16 "Proxy" (formerly middleware) — guards /admin/*
supabase/
  migrations/0001_init.sql
```

## How search works (`src/app/api/search/route.ts`)

1. Claude (`interpretQuery`) reads the raw query and extracts a sector
   number (must be one of 4/5/6/10/12) and/or a category hint — matched
   against **subcategory (L2) names only**, since that's what
   `listings.category_id` actually stores — plus a "cleaned" query with
   location words stripped. Matching a repeated subcategory name (e.g.
   "Insurance") to the wrong parent L1 is a known limitation here: Claude
   returns one name string with no parent context, so the first matching
   row wins. Not worth solving until it's an actual reported problem.
2. Voyage embeds the cleaned query (`input_type: "query"`).
3. `match_listings()` RPC does pgvector cosine-similarity search,
   pre-filtered by that sector/category when found.
4. Claude (`summarizeResults`) writes a one-line natural intro to the
   results.

This hybrid approach (structured extraction + semantic search) keeps exact
filters like "sector 10" reliable while still handling fuzzy queries like
"someone to fix a leaking tap" → plumbers, via embeddings.

**Claude is optional at runtime.** If `ANTHROPIC_API_KEY` isn't set, the route
falls back to pure Voyage semantic search: no sector/category pre-filter
extraction (step 1), and a simple "N results for '...'" string instead of a
written intro (step 4). This was a deliberate choice — Gaurav's claude.ai
subscription (used for Claude Code / this dev work) doesn't cover the
Anthropic API's pay-per-use billing, so the Anthropic key was deferred while
Voyage (which has a free tier) was configured immediately. **Voyage is not
optional** — without `VOYAGE_API_KEY`, search fails entirely. Add
`ANTHROPIC_API_KEY` later (console.anthropic.com, requires a card on file)
to turn on sector-aware filtering and natural-language result summaries —
no code changes needed, it activates automatically once the env var is set.

## How admin listing writes work

Server Actions in `src/app/admin/actions.ts` run with the **signed-in
admin's own session** (cookie-based server client), so writes go through
the "authenticated users manage listings" RLS policy — no service-role key
needed for normal admin CRUD. On every create/update, the action embeds
`name + description + address + landmark` via Voyage and stores it in
`listings.embedding` before writing, so search stays in sync with content
automatically (no separate backfill/reindex step needed for single-listing
edits).

## Bulk upload (admin)

`/admin/listings/bulk` — CSV upload for adding many listings at once
instead of the one-at-a-time form.

- Template: `public/delhidwarka-bulk-template.csv` (linked from the page).
  Required columns: `name, category, subcategory, sector, description`.
  Optional: `address, landmark, phone, whatsapp, website, instagram,
  hours_text, price_range, is_published, featured`.
- `category` (L1) and `subcategory` (L2) must match existing category
  names or slugs (case-insensitive), and the pairing must be correct — a
  row is matched by looking up `category` among L1s, then `subcategory`
  among *that L1's* children specifically, not subcategories in general.
  This exists because some subcategory names repeat under different L1s
  ("Insurance" under both Finance and Professional & Business Services);
  matching on subcategory name alone would be ambiguous. Unmatched rows
  are rejected with a clear error rather than silently dropped or
  auto-created.
- `sector` must be one of 4/5/6/10/12 (same constraint as the DB).
- Parsing happens client-side with `papaparse` (handles quoted
  commas/newlines in descriptions), with a preview table and per-row
  validation errors shown before upload.
- On confirm, `bulkCreateListings()` (`src/app/admin/actions.ts`) embeds
  all valid rows via `embedBatch()` (chunked Voyage calls, not one request
  per row) and inserts them in a single Supabase `insert()` call. Row-level
  errors (bad category/sector/missing fields) are collected and shown
  without failing the whole batch; a batch-level insert error (e.g. a DB
  constraint) fails the whole upload and is surfaced as one error.

## Category browse (public homepage)

`Services.tsx` (a client component) renders the L1 category tiles.
Categories are fetched server-side in `src/app/page.tsx` and passed down as
props. Clicking an L1 tile shows its L2 subcategory chips (plus "All") and
fetches listings for that scope directly from Supabase using the
**browser** client (`src/lib/supabase/client.ts`), relying on the
"published listings are publicly readable" RLS policy rather than going
through `/api/search`. This is a plain filtered browse, not AI search — no
Claude/Voyage calls involved, so it's instant and free. Because the
homepage now fetches categories from Supabase on render, `/` is
dynamically rendered rather than static.

The admin's category-only browse (`Services.tsx`'s equivalent inside
`/admin`, if one gets added later) doesn't exist yet — the admin dashboard
just lists all listings with an "L1 > L2" text column instead.

## Sector filter (public search)

The homepage search (`SearchExperience.tsx`) has sector pill buttons
(All / 4 / 5 / 6 / 10 / 12) above the example-query chips. The selected
sector is:

- Sent explicitly as `sector` in the `/api/search` request body, where it
  **overrides** whatever Claude's `interpretQuery` guessed from the query
  text (see `effectiveSector` in `src/app/api/search/route.ts`) — an
  explicit UI choice should always beat an inferred one.
- Persisted to `localStorage` (`delhidwarka:preferred-sector`) so a
  returning visitor doesn't have to re-pick their sector every time. Read
  back via a `useEffect` (not a lazy `useState` initializer) specifically
  to avoid a hydration mismatch — the server-rendered HTML always starts
  from "no sector selected" and the client syncs from localStorage after
  mount.

## Categories admin section

`/admin/categories` — mirrors the listings section: a grouped L1/L2 table
with checkboxes, an inline "+ New category" form, and a CSV bulk-upload
page at `/admin/categories/bulk`. Server Actions live in
`src/app/admin/categories/actions.ts` (separate file from the listings
actions, same auth model — signed-in admin session, RLS-governed writes).

- **Bulk upload is additive-only and idempotent**: it reuses the same
  `category,subcategory,emoji` CSV shape Gaurav's original taxonomy file
  used, so that same file (or an extended version of it) can be
  re-uploaded at any time to add new categories — existing ones are never
  modified or duplicated, matching is by name (case-insensitive) within
  the correct parent for L2 rows. `emoji` only applies when creating a
  *new* L1; it's ignored for L1s that already exist, so re-uploading won't
  clobber an emoji set some other way.
- **Bulk delete has a listings-reference guard**: before deleting,
  `bulkDeleteCategories` checks whether any listings use that category (or,
  for an L1, any of its L2 children) and refuses those specific ones with a
  reason shown in the UI, rather than either silently failing the whole
  batch or leaving orphaned listings. Categories that ARE safe to delete
  still go through — it's a per-category check, not all-or-nothing.
- Because `ListingForm`, the bulk-upload category matcher, and the search
  route's Claude prompt all fetch categories live from the DB on each
  request, **adding/removing categories here takes effect everywhere else
  immediately** — no code changes needed downstream.

## Bulk delete (admin)

`ListingsTable.tsx` (client component, rendered by `/admin`) has row
checkboxes, a header "select all" checkbox, and a "Delete selected" bar
that appears once anything's checked. It calls `bulkDeleteListings(ids)`
in `actions.ts` (a single Supabase `.delete().in("id", ids)` call). Both
single-row delete and bulk delete now live in this one component — the old
standalone `DeleteListingButton.tsx` was removed.

## Content notes / placeholders to revisit

- Footer contact email `hello@delhidwarka.in` is a placeholder.
- No admin signup UI — create the first admin user manually in Supabase
  dashboard → Authentication → Users.
- `src/lib/supabase/admin.ts` (service-role client) exists but isn't
  currently called anywhere — useful for a future bulk-import/backfill
  script, not required for the app to function.

## Commands

```bash
npm run dev      # local dev server (Turbopack)
npm run build    # production build
npm run start    # run the production build
npm run lint     # ESLint
```

## Conventions for future changes

- Keep components in `src/components/` (public site) vs. `src/app/admin/`
  (admin-only pieces) — don't mix the two.
- Use Tailwind utility classes and the existing CSS variables (`bg-brand`,
  `text-foreground/70`, etc.) rather than introducing new ad hoc colors.
- Any new listing field needs: a migration to add the column, an update to
  `Listing`/`ListingInput` in `types.ts`, a field in `ListingForm.tsx`, and
  likely inclusion in the `embeddingSourceText()` helper in `actions.ts` if
  it should affect search relevance.
- Preserve mobile responsiveness on any new section.
- Run `npm run build`, `npm run lint`, and `npx tsc --noEmit` after changes.
