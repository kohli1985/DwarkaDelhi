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

// Instagram-story-style circular sector nav that scrolls itself continuously
// (CSS-only marquee — no JS state, no hydration timing issues). Each circle
// links straight to /sector/[id]. The track is the sector list rendered
// twice back-to-back and animated exactly one copy's width (-50%), so the
// loop has no visible seam; the second copy is aria-hidden and unfocusable
// so screen readers / tab order only ever see one set of links.
export default function SectorCircles({
  sectors,
  activeSectorId = null,
}: {
  sectors: Sector[];
  activeSectorId?: number | null;
}) {
  if (sectors.length === 0) return null;

  // Roughly constant visual speed regardless of how many sectors there are,
  // with a floor so a short list doesn't whip past.
  const durationSeconds = Math.max(sectors.length * 4, 18);

  function circle(s: Sector, i: number, isDuplicate: boolean) {
    const isActive = activeSectorId === s.id;
    return (
      <Link
        key={`${isDuplicate ? "dup" : "orig"}-${s.id}`}
        href={`/sector/${s.id}`}
        aria-hidden={isDuplicate || undefined}
        tabIndex={isDuplicate ? -1 : undefined}
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
      <div className="group mt-5 overflow-hidden">
        <div
          className="flex w-max gap-5 group-hover:[animation-play-state:paused] sm:gap-7"
          style={{
            animationName: "sector-marquee",
            animationDuration: `${durationSeconds}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
        >
          {sectors.map((s, i) => circle(s, i, false))}
          {sectors.map((s, i) => circle(s, i, true))}
        </div>
      </div>
    </section>
  );
}
