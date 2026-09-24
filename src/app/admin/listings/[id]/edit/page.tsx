import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Category, Listing, Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";
import ListingForm from "../../../ListingForm";
import { updateListing } from "../../../actions";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: listing }, { data: categories }, { data: sectorsData }] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).single(),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("sectors").select("*"),
  ]);

  if (!listing) notFound();

  const updateWithId = updateListing.bind(null, id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Edit listing</h1>
      <div className="mt-8 max-w-2xl">
        <ListingForm
          categories={(categories as Category[]) ?? []}
          sectors={sortSectors((sectorsData as Sector[]) ?? [])}
          listing={listing as Listing}
          action={updateWithId}
        />
      </div>
    </div>
  );
}
