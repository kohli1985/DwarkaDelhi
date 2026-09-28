import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingActionButtons from "@/components/ListingActionButtons";
import { getListingBySlug } from "@/lib/listings";
import { formatPhone, telHref, whatsAppNumber } from "@/lib/phone";
import { SITE_URL } from "@/lib/site";

// Rendered on the server on every request (same as /category/[slug] and
// /sector/[id] — see src/lib/sectors.ts's getActiveSectors comment for why
// those use a cookie-bound Supabase client, which is what makes this
// dynamic rather than statically generated/ISR'd): plain server-rendered
// HTML, fully crawlable by Google with no client JS required for content.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return {};

  const categoryName = listing.category?.name ?? "Local Service";
  const title = `${listing.name} – ${categoryName} in Dwarka Sector ${listing.sector} | DelhiDwarka`;
  const description =
    listing.description.trim() ||
    `${listing.name} is a ${categoryName.toLowerCase()} in Dwarka Sector ${listing.sector}, Delhi — contact details, address and directions on DelhiDwarka.`;
  const canonical = `${SITE_URL}/listing/${listing.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "DelhiDwarka" },
  };
}

function buildJsonLd(
  listing: NonNullable<Awaited<ReturnType<typeof getListingBySlug>>>,
  canonicalUrl: string,
) {
  const phone = formatPhone(listing.phone);

  const address = listing.address
    ? {
        "@type": "PostalAddress",
        streetAddress: listing.address,
        addressLocality: listing.sectorInfo?.name ?? `Sector ${listing.sector}`,
        addressRegion: "Delhi",
        addressCountry: "IN",
      }
    : undefined;

  // The sector's coordinates (supabase/migrations/0005/0006) are an
  // approximate location for the listing, not its exact one — only
  // included when the sector actually has coordinates set, never guessed.
  const geo =
    listing.sectorInfo?.latitude != null && listing.sectorInfo?.longitude != null
      ? {
          "@type": "GeoCoordinates",
          latitude: listing.sectorInfo.latitude,
          longitude: listing.sectorInfo.longitude,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.name,
    url: canonicalUrl,
    ...(listing.description.trim() ? { description: listing.description.trim() } : {}),
    ...(address ? { address } : {}),
    ...(geo ? { geo } : {}),
    ...(phone ? { telephone: phone } : {}),
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const canonicalUrl = `${SITE_URL}/listing/${listing.slug}`;
  const formattedPhone = formatPhone(listing.phone);
  const callHref = telHref(listing.phone);
  // Prefers the dedicated `whatsapp` field when set; falls back to `phone`
  // — many listings only ever give one number that's used for both.
  const waNumber = whatsAppNumber(listing.whatsapp) ?? whatsAppNumber(listing.phone);
  const whatsappHref = waNumber ? `https://wa.me/${waNumber}` : null;
  const directionsHref = listing.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${listing.name}, ${listing.address}`,
      )}`
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(listing, canonicalUrl)) }}
      />
      <Header />
      <main className="flex-1">
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-2xl px-5 sm:px-8">
            <Link
              href={listing.topCategory ? `/category/${listing.topCategory.slug}` : "/"}
              className="text-sm font-medium text-foreground/50 hover:text-foreground"
            >
              ← Back
            </Link>

            <div className="mt-4 flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {listing.name}
                {listing.featured && (
                  <span className="ml-2 inline-block rounded-full bg-brand/10 px-2.5 py-0.5 align-middle text-xs font-semibold text-brand-dark">
                    Featured
                  </span>
                )}
              </h1>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/60">
              {listing.category && listing.topCategory && (
                <Link
                  href={`/category/${listing.topCategory.slug}`}
                  className="font-medium text-brand-dark hover:underline"
                >
                  {listing.category.name}
                </Link>
              )}
              {listing.category && <span aria-hidden="true">·</span>}
              <Link href={`/sector/${listing.sector}`} className="hover:underline">
                {listing.sectorInfo?.name ?? `Sector ${listing.sector}`}
              </Link>
            </div>

            {listing.address && (
              <p className="mt-4 text-sm leading-6 text-foreground/70">{listing.address}</p>
            )}

            {listing.description.trim() && (
              <p className="mt-6 text-base leading-7 text-foreground/80">
                {listing.description}
              </p>
            )}

            {listing.hours_text && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Hours
                </p>
                <p className="mt-1 text-sm text-foreground/70">{listing.hours_text}</p>
              </div>
            )}

            {formattedPhone && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Phone
                </p>
                <p className="mt-1 text-sm text-foreground/70">{formattedPhone}</p>
              </div>
            )}

            <div className="mt-8">
              <ListingActionButtons
                listingId={listing.id}
                callHref={callHref}
                whatsappHref={whatsappHref}
                directionsHref={directionsHref}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
