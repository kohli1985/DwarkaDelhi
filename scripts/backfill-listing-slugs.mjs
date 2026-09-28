#!/usr/bin/env node
// Backfills a slug for every listing that doesn't already have one, so
// /listing/[slug] works for listings created before
// supabase/migrations/0009_listing_slug.sql. Writes to the DB — this is
// NOT a read-only report like scripts/data-quality-report.mjs.
//
// Run ONLY after applying 0009_listing_slug.sql (it needs the `slug`
// column and its unique index to exist), from your own Terminal (this
// needs real network access to Supabase, which the agent sandbox this was
// written in does not have):
//
//   node --env-file=.env.local scripts/backfill-listing-slugs.mjs
//
// Safe to re-run: only fills rows where slug is still null, never touches
// a listing that already has one.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (bypasses RLS so this
// sees and updates unpublished listings too, not just public ones).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with " +
      "`node --env-file=.env.local scripts/backfill-listing-slugs.mjs` from the project root.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Mirrors src/lib/slug.ts's buildListingSlugBase — kept as a plain copy
// rather than importing the TS module, since this script runs directly
// with `node`, not through the Next.js/TS build.
function slugifyName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBase(name, sector) {
  const base = slugifyName(name);
  return `${base || "listing"}-sector-${sector}`;
}

async function main() {
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, name, sector, slug")
    .order("created_at", { ascending: true }); // stable, deterministic order for suffix assignment

  if (error) {
    console.error("Failed to fetch listings:", error.message);
    process.exit(1);
  }

  const missing = listings.filter((l) => !l.slug);
  if (missing.length === 0) {
    console.log("Every listing already has a slug — nothing to do.");
    return;
  }

  console.log(`${missing.length} of ${listings.length} listings need a slug. Assigning…\n`);

  // Seed "taken" with every slug that already exists (so a newly-generated
  // one can't collide with one a previous run — or the admin app — already
  // assigned), then claim each missing one in order.
  const taken = new Set(listings.map((l) => l.slug).filter(Boolean));

  let updated = 0;
  const failures = [];

  for (const l of missing) {
    const base = buildBase(l.name, l.sector);
    let candidate = base;
    let suffix = 2;
    while (taken.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix++;
    }
    taken.add(candidate);

    const { error: updateError } = await supabase
      .from("listings")
      .update({ slug: candidate })
      .eq("id", l.id);

    if (updateError) {
      failures.push({ id: l.id, name: l.name, message: updateError.message });
      continue;
    }

    console.log(`  [${l.id}] "${l.name}" (Sector ${l.sector}) -> ${candidate}`);
    updated++;
  }

  console.log(`\nDone. ${updated} listing(s) updated, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  [${f.id}] "${f.name}": ${f.message}`);
    }
  }
}

main();
