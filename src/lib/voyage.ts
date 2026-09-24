// Thin wrapper around the Voyage AI embeddings API.
// Used to embed listing text on save (input_type: "document") and search
// queries at search time (input_type: "query") — Voyage recommends using
// the matching input_type for best retrieval quality.
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5-lite"; // 1024-dim, matches the `embedding vector(1024)` column

type VoyageInputType = "query" | "document";

export async function embed(
  text: string,
  inputType: VoyageInputType,
): Promise<number[]> {
  const [embedding] = await embedBatch([text], inputType);
  return embedding;
}

// Embeds many texts in one or few API calls instead of one call per row —
// used by the admin bulk-upload flow so a 100-row CSV doesn't make 100
// sequential Voyage requests. Chunked well under Voyage's per-request
// limits (128 inputs / request for this model family).
const BATCH_CHUNK_SIZE = 64;

export async function embedBatch(
  texts: string[],
  inputType: VoyageInputType,
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set");
  }
  if (texts.length === 0) return [];

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_CHUNK_SIZE) {
    const chunk = texts.slice(i, i + BATCH_CHUNK_SIZE);

    const res = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: chunk,
        model: MODEL,
        input_type: inputType,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Voyage embeddings request failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    // Voyage returns embeddings in input order with an `index` field —
    // sort defensively rather than assuming array order matches.
    const sorted = [...data.data].sort(
      (a: { index: number }, b: { index: number }) => a.index - b.index,
    );
    results.push(...sorted.map((d: { embedding: number[] }) => d.embedding));
  }

  return results;
}
