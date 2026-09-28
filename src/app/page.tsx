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
