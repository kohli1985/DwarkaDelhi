#!/usr/bin/env node
// Read-only data-quality report for DelhiDwarka listings. Detects likely
// duplicates, sector/address mismatches, and missing/placeholder names —
// prints a report only. Never updates, deletes, or merges anything.
//
// Run from the project root with your own Terminal (this script needs
// real network access to Supabase, which the agent sandbox this was
// written in does not have):
//
//   node --env-file=.env.local scripts/data-quality-report.mjs
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (already used by
// src/app/admin/actions.ts) so the report sees every listing, including
// unpublished ones — RLS would otherwise hide those from a plain read.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with " +
      "`node --env-file=.env.local scripts/data-quality-report.mjs` from the project root.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// --- Phone normalization (mirrors src/lib/phone.ts's normalizePhone) -----
// Kept as a plain copy rather than importing the TS module, since this
// script runs directly with `node`, not through the Next.js/TS build.
function normalizePhone(raw) {
  if (!raw) return null;
  const withoutFloatSuffix = raw.trim().replace(/\.0+$/, "");
  const digits = withoutFloatSuffix.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

// --- Lightweight string similarity (no new dependency) --------------------
// Dice's coefficient over character bigrams — cheap, dependency-free, and
// good enough to flag "Clove Dental Clinic" vs "Clove Dental" as similar
// without a fuzzy-matching library.
function normalizeForCompare(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s) {
  const set = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2);
    set.set(bg, (set.get(bg) ?? 0) + 1);
  }
  return set;
}

function diceCoefficient(a, b) {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const bgA = bigrams(na);
  const bgB = bigrams(nb);
  let overlap = 0;
  for (const [bg, countA] of bgA) {
    const countB = bgB.get(bg);
    if (countB) overlap += Math.min(countA, countB);
  }
  const totalA = [...bgA.values()].reduce((a, b) => a + b, 0);
  const totalB = [...bgB.values()].reduce((a, b) => a + b, 0);
  if (totalA + totalB === 0) return 0;
  return (2 * overlap) / (totalA + totalB);
}

// A listing counts as "similar enough to flag" when its name+address text
// scores above this against another listing in the same sector.
const NAME_SIMILARITY_THRESHOLD = 0.55;

async function main() {
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, name, phone, sector, address, landmark, is_published, featured, category_id")
    .order("sector", { ascending: true });

  if (error) {
    console.error("Failed to fetch listings:", error.message);
    process.exit(1);
  }

  console.log(`Loaded ${listings.length} listings (published and unpublished).\n`);

  // --- Item 5: duplicate detection ---------------------------------------
  console.log("=".repeat(72));
  console.log("ITEM 5 — Likely duplicate listings (report only, nothing changed)");
  console.log("=".repeat(72));

  // 5a. Same normalized phone.
  const byPhone = new Map();
  for (const l of listings) {
    const phone = normalizePhone(l.phone);
    if (!phone || phone.length < 10) continue; // skip blank/unusable phones
    if (!byPhone.has(phone)) byPhone.set(phone, []);
    byPhone.get(phone).push(l);
  }
  const phoneDupGroups = [...byPhone.entries()].filter(([, group]) => group.length > 1);

  console.log(`\n-- Same normalized phone (${phoneDupGroups.length} group(s)) --`);
  for (const [phone, group] of phoneDupGroups) {
    console.log(`  Phone ${phone}:`);
    for (const l of group) {
      console.log(
        `    - [${l.id}] "${l.name}" — Sector ${l.sector} — ${l.address ?? "(no address)"} ${
          l.is_published ? "" : "(unpublished)"
        }`,
      );
    }
  }

  // 5b. Same sector + similar name/address.
  const bySector = new Map();
  for (const l of listings) {
    if (!bySector.has(l.sector)) bySector.set(l.sector, []);
    bySector.get(l.sector).push(l);
  }
  const nameAddressDupPairs = [];
  for (const group of bySector.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const nameScore = diceCoefficient(a.name, b.name);
        const addressScore = diceCoefficient(a.address ?? "", b.address ?? "");
        // Flag if names are quite similar, OR names are somewhat similar
        // AND addresses are quite similar too (catches "X Clinic" vs "X"
        // at the same address, which name-only similarity can under-score).
        const flagged =
          nameScore >= NAME_SIMILARITY_THRESHOLD ||
          (nameScore >= 0.35 && addressScore >= NAME_SIMILARITY_THRESHOLD);
        if (flagged) {
          nameAddressDupPairs.push({ a, b, nameScore, addressScore });
        }
      }
    }
  }

  console.log(`\n-- Same sector + similar name/address (${nameAddressDupPairs.length} pair(s)) --`);
  for (const { a, b, nameScore, addressScore } of nameAddressDupPairs) {
    console.log(
      `  Sector ${a.sector} — name similarity ${nameScore.toFixed(2)}, address similarity ${addressScore.toFixed(2)}:`,
    );
    console.log(`    - [${a.id}] "${a.name}" — ${a.address ?? "(no address)"}`);
    console.log(`    - [${b.id}] "${b.name}" — ${b.address ?? "(no address)"}`);
  }

  // --- Item 6: sector/address mismatch ------------------------------------
  console.log("\n" + "=".repeat(72));
  console.log("ITEM 6 — Sector tag contradicts address (report only)");
  console.log("=".repeat(72) + "\n");

  const sectorMismatches = [];
  const sectorRegex = /sector\s*[-#]?\s*(\d{1,2})\b/i;
  for (const l of listings) {
    const haystack = `${l.address ?? ""} ${l.landmark ?? ""}`;
    const match = haystack.match(sectorRegex);
    if (!match) continue;
    const mentionedSector = Number(match[1]);
    if (mentionedSector !== l.sector) {
      sectorMismatches.push({ ...l, mentionedSector });
    }
  }

  console.log(`${sectorMismatches.length} listing(s) whose address/landmark names a different sector:\n`);
  for (const l of sectorMismatches) {
    console.log(
      `  [${l.id}] "${l.name}" — tagged Sector ${l.sector}, but address/landmark mentions Sector ${l.mentionedSector}`,
    );
    console.log(`    Address: ${l.address ?? "(none)"}  Landmark: ${l.landmark ?? "(none)"}`);
  }

  // --- Item 8: missing or placeholder name --------------------------------
  console.log("\n" + "=".repeat(72));
  console.log("ITEM 8 — Missing or placeholder name (report only)");
  console.log("=".repeat(72) + "\n");

  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const placeholderNames = [];
  for (const l of listings) {
    const name = (l.name ?? "").trim();
    const hasPhone = Boolean(normalizePhone(l.phone));
    const categoryName = categoryNameById.get(l.category_id);
    const nameMatchesCategory =
      categoryName && name.toLowerCase() === categoryName.toLowerCase();

    if (!name || name.length < 3 || (nameMatchesCategory && !hasPhone)) {
      placeholderNames.push({ ...l, categoryName, reason: !name || name.length < 3
        ? "blank or too short"
        : "name is just the category name, with no phone" });
    }
  }

  console.log(`${placeholderNames.length} listing(s) with a missing/placeholder name:\n`);
  for (const l of placeholderNames) {
    console.log(
      `  [${l.id}] "${l.name || "(blank)"}" — Sector ${l.sector} — ${l.reason} — phone: ${l.phone || "(none)"}`,
    );
  }

  console.log("\nDone. No rows were changed — this is a report only.");
}

main();
