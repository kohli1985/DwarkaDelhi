import { createClient } from "@/lib/supabase/server";
import type { Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";
import { listApartments } from "./actions";
import ApartmentsManager from "./ApartmentsManager";

export default async function ApartmentsPage() {
  const supabase = await createClient();
  const [apartments, { data: sectorsData }] = await Promise.all([
    listApartments(),
    supabase.from("sectors").select("*"),
  ]);
  const sectors = sortSectors((sectorsData as Sector[]) ?? []);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Apartments</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {apartments.length} apartment{apartments.length === 1 ? "" : "s"} recorded. Naming which
          sector each one sits in lets a query like &quot;plumber near Sai CGHS&quot; get the same
          &quot;near me&quot; ranking a sector number gets.
        </p>
      </div>

      <ApartmentsManager apartments={apartments} sectors={sectors} />
    </div>
  );
}
