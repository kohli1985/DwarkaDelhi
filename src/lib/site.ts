// Single source of truth for the site's public base URL — used to build
// absolute canonical URLs, JSON-LD, and the sitemap. Set NEXT_PUBLIC_SITE_URL
// in .env.local (and in your Vercel project's env vars for production) —
// see .env.local.example. Falls back to localhost so local dev doesn't
// crash if it's unset, but production should always set it explicitly.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
