import Link from "next/link";
import type { CSSProperties } from "react";
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
// /sector/[id]. The track renders the sector list twice back-to-back and
// continuously animates exactly one copy's width (see the sector-marquee
// keyframes in globals.css), so the loop reads as seamless. Paused on
// hover/focus so a visitor can actually read and click a circle instead of
// chasing a moving target, and it falls back to a plain manually-scrollable
// row (no animation) for prefers-reduced-motion.
export default function SectorCircles({
  sectors,
  activeSectorId = null,
}: {
  sectors: Sector[];
  activeSectorId?: number | null;
}) {
  if (sectors.length === 0) return null;

  function circle(s: Sector, i: number, copy: "a" | "b") {
    const isActive = activeSectorId === s.id;
    return (
      <Link
        key={`${copy}-${s.id}`}
        href={`/sector/${s.id}`}
        // Duplicated track is decorative scroll filler for anyone not using
        // a screen reader — only the first copy needs to be announced, the
        // second copy is hidden from assistive tech so sectors aren't read
        // out twice.
        aria-hidden={copy === "b" ? true : undefined}
        tabIndex={copy === "b" ? -1 : undefined}
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

  // Speed scales with how much content there is, so the per-circle pace
  // stays roughly constant whether there are 10 sectors or 30.
  const durationSeconds = Math.max(20, sectors.length * 2.5);

  return (
    <section className="bg-background py-10 sm:py-14">
      <p className="text-center text-sm font-semibold uppercase tracking-wide text-brand">
        Browse by sector
      </p>
      <div className="group mt-5 overflow-x-auto">
        <div
          className="flex w-max animate-[sector-marquee_var(--sector-marquee-duration)_linear_infinite] gap-5 px-5 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none sm:gap-7 sm:px-8"
          style={{ "--sector-marquee-duration": `${durationSeconds}s` } as CSSProperties}
        >
          {sectors.map((s, i) => circle(s, i, "a"))}
          {sectors.map((s, i) => circle(s, i, "b"))}
        </div>
      </div>
    </section>
  );
}
