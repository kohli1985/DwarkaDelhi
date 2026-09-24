import Link from "next/link";
import type { Category } from "@/lib/supabase/types";
import { groupCategories } from "@/lib/supabase/types";

type Props = {
  categories: Category[];
  // When set, tiles link with ?sector=<id> so the destination category page
  // opens pre-filtered to this sector (used on /sector/[id]).
  sectorId?: number | null;
  title?: string;
  description?: string;
};

// Plain navigation grid — each tile is a Link to its own /category/[slug]
// page (listings + filters live there now, not inline on this page).
export default function CategoryGrid({
  categories,
  sectorId = null,
  title = "Categories",
  description = "Tap a category to browse its listings, or use the search above to ask for exactly what you need.",
}: Props) {
  const groups = groupCategories(categories);
  const query = sectorId !== null ? `?sector=${sectorId}` : "";

  return (
    <section id="services" className="bg-foreground/[0.02] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">
            What&apos;s here
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg leading-8 text-foreground/70">{description}</p>
        </div>

        {groups.length === 0 ? (
          <p className="mt-14 text-center text-sm text-foreground/50">
            No categories have listings here yet — check back soon.
          </p>
        ) : (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map(({ top }) => (
              <Link
                key={top.id}
                href={`/category/${top.slug}${query}`}
                className="rounded-2xl border border-foreground/10 bg-background p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-md"
              >
                <span className="text-3xl">{top.emoji}</span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{top.name}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/65">Tap to browse</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
