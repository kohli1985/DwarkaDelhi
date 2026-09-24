import { createClient } from "@/lib/supabase/server";
import type { Sector } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";
import SectorsManager from "./SectorsManager";

export default async function SectorsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("sectors").select("*");
  const sectors = sortSectors((data as Sector[]) ?? []);
  const activeCount = sectors.filter((s) => s.is_active).length;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sectors</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {sectors.length} sector{sectors.length === 1 ? "" : "s"}, {activeCount} visible on the
          site.
        </p>
      </div>

      <SectorsManager sectors={sectors} />
    </div>
  );
}
