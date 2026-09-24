// Claude is used for three things in the search flow (see
// src/app/api/search/route.ts):
//  1. interpretQuery — pull a sector number / category hint out of free text
//     ("swimming classes near sector 10") so we can pre-filter the vector
//     search instead of relying on embeddings alone for exact filters.
//  2. summarizeResults — a short, conversational one-liner introducing the
//     results, the way a helpful local would answer instead of a bare list.
//  3. findExternalMatches — when the directory itself has nothing, use
//     Claude's hosted web_search tool to find real local businesses so the
//     visitor still gets a useful answer instead of a dead end. Clearly
//     unverified/external — never mixed into the directory's own results,
//     never saved to the DB automatically.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";
// interpretQuery and summarizeResults are small, structured tasks (pull a
// sector number out of text; write one plain sentence) — Haiku handles
// them just as reliably as Sonnet but noticeably faster, which matters
// here since both sit directly in the search request's critical path.
// findExternalMatches keeps the full model: it has to reason across
// several web_search results and filter out ones that aren't a real match,
// which benefits more from the stronger model than it costs in latency.
const FAST_MODEL = "claude-haiku-4-5-20251001";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey });
}

export type QueryInterpretation = {
  sector: number | null;
  categoryHint: string | null;
  cleanedQuery: string;
};

// `validSectorIds` comes from the `sectors` table (active ones — see
// src/app/api/search/route.ts) rather than a hardcoded list, so newly added
// sectors are recognized by name/number without a code change.
export async function interpretQuery(
  query: string,
  subcategoryNames: string[],
  validSectorIds: number[],
): Promise<QueryInterpretation> {
  const client = getClient();

  const message = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 300,
    system:
      "You extract structured filters from a search query for a local services " +
      "directory in Dwarka, Delhi. Respond with ONLY compact JSON, no prose, " +
      `matching: {"sector": number|null, "categoryHint": string|null, "cleanedQuery": string}. ` +
      `Valid sectors are exactly: ${validSectorIds.join(", ")}. If the query mentions a ` +
      "different sector number, or none, set sector to null. categoryHint should be " +
      "the single best-matching SUBCATEGORY (not the broader category) from this " +
      `list if any clearly applies, else null: ${subcategoryNames.join(", ")}. ` +
      "cleanedQuery is the query with sector/location words stripped, kept natural for semantic search.",
    messages: [{ role: "user", content: query }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const parsed = JSON.parse(text);
    return {
      sector: validSectorIds.includes(parsed.sector) ? parsed.sector : null,
      categoryHint: parsed.categoryHint ?? null,
      cleanedQuery: parsed.cleanedQuery || query,
    };
  } catch {
    // If Claude doesn't return clean JSON, fall back to an unfiltered search
    // rather than failing the whole request.
    return { sector: null, categoryHint: null, cleanedQuery: query };
  }
}

export type ExternalMatch = {
  name: string;
  description: string;
  address: string | null;
  phone: string | null;
  sourceUrl: string;
};

// Only called when the directory's own semantic search comes back empty
// (src/app/api/search/route.ts) — a deliberate fallback, not a blend with
// real listings, so it never displaces or outranks an actual directory
// entry. Capped at 3 searches per call (max_uses) to bound cost — this
// endpoint is public, and each search is billed separately from tokens.
export async function findExternalMatches(
  query: string,
  sectorName: string | null,
): Promise<ExternalMatch[]> {
  const client = getClient();
  const locationHint = sectorName ? `${sectorName}, Dwarka, Delhi` : "Dwarka, Delhi";

  const message = await client.messages.create({
    model: MODEL,
    // Generous budget: with up to 3 searches, the search results + the
    // model's own narration before its final JSON answer can add up to
    // more than 1024 tokens, and a truncated response cuts off before the
    // JSON array ever appears — which used to fail completely silently
    // (see the logging added below).
    max_tokens: 3000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    system:
      "You help find real local businesses for a Dwarka, Delhi services directory " +
      `when its own listings have no match. Search the web for real, currently ` +
      `operating businesses near ${locationHint} matching the user's request. ` +
      "Use only what the search results actually say — never invent a name, " +
      "address, or phone number. Prefer results genuinely in or very near " +
      `${locationHint}; skip anything you can't place there. Return at most 4 ` +
      "results. " +
      "After searching, your FINAL message must be ONLY a compact JSON array " +
      '(no prose, no markdown fences), each item shaped as: ' +
      '{"name": string, "description": string (one short sentence), ' +
      '"address": string|null, "phone": string|null, "sourceUrl": string}. ' +
      "If nothing relevant turns up, return [].",
    messages: [{ role: "user", content: query }],
  });

  // The model's last text block is the JSON answer — earlier blocks are its
  // own "let me search for..." narration and the search tool calls/results.
  const textBlocks = message.content.filter((block) => block.type === "text");
  const lastText = textBlocks[textBlocks.length - 1];

  // Every early-return below used to just `return []` with no log line —
  // indistinguishable from "the web genuinely had nothing relevant". Now
  // each case logs why, so a silent empty result is diagnosable instead of
  // a guessing game (see supabase/migrations-era debugging in this file's
  // history for why that mattered).
  if (message.stop_reason === "max_tokens") {
    console.error(
      `findExternalMatches: response hit max_tokens before finishing (query: "${query}") — raise max_tokens further if this recurs`,
    );
  }
  if (!lastText || lastText.type !== "text") {
    console.error("findExternalMatches: no text block in Claude's response", {
      query,
      stopReason: message.stop_reason,
      blockTypes: message.content.map((b) => b.type),
    });
    return [];
  }

  try {
    // Claude sometimes wraps JSON in a sentence despite instructions —
    // pull out the array itself rather than assuming the whole string parses.
    const match = lastText.text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("findExternalMatches: no JSON array found in final text", {
        query,
        stopReason: message.stop_reason,
        text: lastText.text.slice(0, 500),
      });
      return [];
    }
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        description: String(item.description ?? "").trim(),
        address: item.address ? String(item.address).trim() : null,
        phone: item.phone ? String(item.phone).trim() : null,
        sourceUrl: String(item.sourceUrl ?? "").trim(),
      }))
      .filter((item) => item.name && item.sourceUrl);
  } catch (err) {
    console.error("findExternalMatches: JSON.parse failed on extracted match", {
      query,
      err,
      text: lastText.text.slice(0, 500),
    });
    return [];
  }
}

export async function summarizeResults(
  query: string,
  results: { name: string; category: string; sector: number }[],
): Promise<string> {
  if (results.length === 0) {
    return "Couldn't find a match for that yet — the directory is still growing, so try a broader search or check back soon.";
  }

  const client = getClient();
  const listSummary = results
    .slice(0, 8)
    .map((r) => `${r.name} (${r.category}, Sector ${r.sector})`)
    .join("; ");

  const message = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 150,
    system:
      "You are a friendly local guide for a Dwarka, Delhi services directory. " +
      "Given a search query and the matching results, write ONE short sentence " +
      "introducing them naturally, the way a helpful neighbour would. No markdown, " +
      "no bullet points, do not invent details not in the results.",
    messages: [
      {
        role: "user",
        content: `Query: "${query}"\nResults: ${listSummary}`,
      },
    ],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}
