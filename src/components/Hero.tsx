export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-background to-background dark:from-amber-950/20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-brand/20 blur-3xl sm:h-96 sm:w-96"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-[-10%] h-72 w-72 rounded-full bg-accent/20 blur-3xl sm:h-96 sm:w-96"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-16 pt-16 text-center sm:px-8 sm:pb-24 sm:pt-24">
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Ask for what you need,{" "}
          <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
            find it in Dwarka
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-foreground/70 sm:text-xl">
          One place for everything scattered across Google, group chats, and
          word of mouth — restaurants, classes, repairs, and shops across
          Dwarka. Just ask, in plain words.
        </p>

        <div className="mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <a
            href="#search"
            className="w-full rounded-full bg-brand px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-dark sm:w-auto"
          >
            Try the search
          </a>
          <a
            href="#about"
            className="w-full rounded-full border border-foreground/15 px-8 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-foreground/5 sm:w-auto"
          >
            Learn more
          </a>
        </div>
      </div>
    </section>
  );
}
