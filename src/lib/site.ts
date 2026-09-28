// Single source of truth for the site's public base URL — used to build
// absolute canonical URLs, JSON-LD, OG tags, robots.txt and the sitemap.
//
// Resolution order:
//   1. NEXT_PUBLIC_SITE_URL — set this explicitly in .env.local and in the
//      Vercel project's env vars once a custom domain is attached (see
//      .env.local.example).
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel sets this automatically to
//      the project's production domain (e.g. "delhidwarka.vercel.app", no
//      protocol), so a deploy still gets a correct, non-localhost URL even
//      before NEXT_PUBLIC_SITE_URL is configured.
//   3. http://localhost:3000 — only as a silent fallback in local dev
//      (NODE_ENV === "development"). Outside dev, reaching this fallback
//      means a production build would leak "localhost" into the sitemap,
//      robots.txt, canonical URLs, OG tags and JSON-LD, which is always a
//      misconfiguration — so that case logs a loud warning instead of
//      failing silently.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl) return `https://${vercelProductionUrl}`.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  console.warn(
    "[src/lib/site.ts] Neither NEXT_PUBLIC_SITE_URL nor VERCEL_PROJECT_PRODUCTION_URL is set " +
      "outside local development — falling back to http://localhost:3000, which will leak into " +
      "the sitemap, robots.txt, canonical URLs, OG tags and JSON-LD. Set NEXT_PUBLIC_SITE_URL.",
  );
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
