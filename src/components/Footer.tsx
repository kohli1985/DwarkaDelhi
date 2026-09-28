import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveSectors } from "@/lib/sectors";
import type { Category } from "@/lib/supabase/types";
import { sortSectors } from "@/lib/supabase/types";

// Self-fetches its own data (top-level categories, non-empty sectors)
// rather than taking props — Footer is dropped into every page as a plain
// <Footer />, and every one of those pages already fetches its own
// category/sector data shaped differently for its own needs, so wiring
// the same two lists through as props everywhere would mean touching
// every page for a footer link list. One extra small query per page load
// is a fine trade for that.
export default async function Footer() {
  const supabase = await createClient();
  const [{ data: categoriesData }, sectorsData] = await Promise.all([
    supabase.from("categories").select("*").eq("level", 1).order("sort_order"),
    getActiveSectors(supabase),
  ]);
  const categories = (categoriesData as Category[] | null) ?? [];
  const sectors = sortSectors(sectorsData);

  return (
    <footer className="border-t border-foreground/10 bg-background">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <span className="flex items-center justify-center gap-2 text-lg font-semibold sm:justify-start">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm text-white">
                D
              </span>
              DelhiDwarka
            </span>
            <p className="mt-2 max-w-sm text-sm text-foreground/60">
              A local services directory for Dwarka, Delhi, built by and for
              the community.
            </p>
          </div>

          <a
            href="mailto:hello@delhidwarka.in"
            className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            hello@delhidwarka.in
          </a>
        </div>

        {(categories.length > 0 || sectors.length > 0) && (
          <div className="mt-10 grid gap-8 border-t border-foreground/10 pt-8 text-left sm:grid-cols-2">
            {categories.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Categories
                </p>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/category/${c.slug}`}
                        className="text-sm text-foreground/60 hover:text-foreground hover:underline"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sectors.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Sectors
                </p>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {sectors.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/sector/${s.id}`}
                        className="text-sm text-foreground/60 hover:text-foreground hover:underline"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-between gap-3 text-xs text-foreground/40 sm:flex-row">
          <p>© {new Date().getFullYear()} DelhiDwarka. Made for the Dwarka community.</p>
          <Link href="/privacy" className="hover:text-foreground/70 hover:underline">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
