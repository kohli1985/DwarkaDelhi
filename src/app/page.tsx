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

// Google Search Console's HTML-tag verification method only needs the meta
// tag on one page (conventionally the homepage) — set NEXT_PUBLIC_SITE_URL's
// neighbor NEXT_PUBLIC_GSC_VERIFICATION to the content value GSC gives you.
// Left unset, nothing is rendered rather than an empty/placeholder tag.
const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

export const metadata: Metadata = gscVerification
  ? { verification: { google: gscVerification } }
  : {};

export default async function Home() {
  const supabase = await createClient();
  const [{ data: categories }, sectorsData] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    getActiveSectors(supabase),
  ]);

  return (
    <>
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
