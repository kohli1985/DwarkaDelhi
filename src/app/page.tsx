import type { Metadata } from "next";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SearchExperience from "@/components/SearchExperience";
import SectorCircles from "@/components/SectorCircles";
import CategoryGrid from "@/components/CategoryGrid";
import About from "@/components/About";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { getActiveSectors } from "@/lib/sectors";
import type { Category, Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";
import { SITE_URL } from "@/lib/site";

// Google Search Console's HTML-tag verification method only needs the meta
// tag on one page (conventionally the homepage) — set NEXT_PUBLIC_SITE_URL's
// neighbor NEXT_PUBLIC_GSC_VERIFICATION to the content value GSC gives you.
// Left unset, nothing is rendered rather than an empty/placeholder tag.
const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

const title = "DelhiDwarka – Local Services, Shops & Clinics in Dwarka, Delhi";
const description =
  "DelhiDwarka connects residents of Dwarka, Delhi with trusted local services, shops and clinics — search by name or need, browse by sector, and get contact details, addresses and directions.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: SITE_URL },
  openGraph: { title, description, url: SITE_URL, siteName: "DelhiDwarka" },
  twitter: { card: "summary_large_image", title, description },
  ...(gscVerification ? { verification: { google: gscVerification } } : {}),
};

function buildHomeJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "DelhiDwarka",
      url: SITE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "DelhiDwarka",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

export default async function Home() {
  const supabase = await createClient();
  const [{ data: categories }, sectorsData] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    getActiveSectors(supabase),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildHomeJsonLd()) }}
      />
      <Header />
      <main className="flex-1">
        <Hero />
        <SearchExperience sectorId={null} sectorName={null} />
        <SectorCircles sectors={sortSectors((sectorsData as Sector[]) ?? [])} />
        <CategoryGrid categories={(categories as Category[]) ?? []} />
        <About />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
