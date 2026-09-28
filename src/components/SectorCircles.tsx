import Link from "next/link";
import type { Sector } from "@/lib/supabase/types";

// Rotating ring gradients, cycled by index — purely decorative.
const RING_STYLES = [
  "from-amber-400 to-orange-500",
  "from-sky-400 to-cyan-500",
  "from-violet-400 to-fuchsia-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
];

// Instagram-story-style circular sector nav. Each circle links straight to
// /sector/[id]. Renders the sector list exactly once in a horizontally
// scrollable row (overflow-x-auto) — previously this animated a duplicated
// copy of the list via CSS marquee, but with the current sector count the
// un-duplicated content doesn't overflow the viewport, so both copies were
// visible at once instead of one being scrolled off-screen.
export default function SectorCircles({
  sectors,
  activeSectorId = null,
}: {
  sectors: Sector[];
  activeSectorId?: number | null;
}) {
  if (sectors.length === 0) return null;

  function circle(s: Sector, i: number) {
    const isActive = activeSectorId === s.id;
    return (
      <Link
        key={s.id}
        href={`/sector/${s.id}`}
        className="flex shrink-0 flex-col items-center gap-2"
      >
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br p-[3px] transition-transform hover:scale-105 sm:h-20 sm:w-20 ${
            RING_STYLES[i % RING_STYLES.length]
          } ${isActive ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""}`}
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-background text-lg font-bold text-foreground sm:text-xl">
            {s.name.replace(/^sector\s*/i, "")}
          </span>
        </span>
        <span className="max-w-[4.5rem] truncate text-xs font-medium text-foreground/60">
          {s.name}
        </span>
      </Link>
    );
  }

  return (
    <section className="bg-background py-10 sm:py-14">
      <p className="text-center text-sm font-semibold uppercase tracking-wide text-brand">
        Browse by sector
      </p>
      <div className="mt-5 overflow-x-auto">
        <div className="flex w-max gap-5 px-5 sm:gap-7 sm:px-8">
          {sectors.map((s, i) => circle(s, i))}
        </div>
      </div>
    </section>
  );
}
