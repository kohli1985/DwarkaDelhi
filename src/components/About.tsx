const highlights = [
  {
    title: "Search, not scroll",
    description:
      "Ask in your own words — \"swimming classes near sector 10\" — and the search understands what you mean, not just keyword matches.",
  },
  {
    title: "Genuinely local",
    description:
      "Focused on Dwarka's commercial sectors — covered properly, rather than a thin spread across the whole sub-city.",
  },
  {
    title: "Built by a resident",
    description:
      "DelhiDwarka started as a side project to solve a problem residents here already know well: finding services you can actually trust, without ten Google tabs open.",
  },
];

export default function About() {
  return (
    <section id="about" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wide text-brand">
              About DelhiDwarka
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything scattered across Google, in one place
            </h2>
            <p className="mt-6 text-lg leading-8 text-foreground/70">
              Right now, finding a dance class, a swimming pool, or a decent
              dentist nearby means separate Google searches, old WhatsApp
              group messages, or just asking around — and the results are
              never quite specific to your sector.
            </p>
            <p className="mt-4 text-lg leading-8 text-foreground/70">
              DelhiDwarka brings restaurants, classes, repairs, clinics, and
              shops across Dwarka into one searchable directory, with an
              AI-powered search that understands what you&apos;re actually
              asking for. Every listing is kept current by an admin, not left
              to rot.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-1">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6 transition-colors hover:border-brand/30"
              >
                <h3 className="text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground/65">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
