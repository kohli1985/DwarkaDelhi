import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SearchExperience from "@/components/SearchExperience";
import SectorCircles from "@/components/SectorCircles";
import CategoryGrid from "@/components/CategoryGrid";
import About from "@/components/About";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import type { Category, Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: categories }, { data: sectorsData }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    // Explicit is_active filter, not just RLS — if the person viewing this
    // page happens to be signed in as the admin (same browser), the
    // "authenticated users manage sectors" RLS policy would otherwise let
    // this query see inactive sectors too, showing them on the public site.
    supabase.from("sectors").select("*").eq("is_active", true),
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
