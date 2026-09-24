import { createClient } from "@/lib/supabase/server";
import type { Category, Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";
import ListingForm from "../../ListingForm";
import { createListing } from "../../actions";

export default async function NewListingPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: sectorsData }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("sectors").select("*"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">New listing</h1>
      <div className="mt-8 max-w-2xl">
        <ListingForm
          categories={(categories as Category[]) ?? []}
          sectors={sortSectors((sectorsData as Sector[]) ?? [])}
          action={createListing}
        />
      </div>
    </div>
  );
}
