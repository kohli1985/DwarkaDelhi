export default function Footer() {
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

        <p className="mt-10 text-center text-xs text-foreground/40 sm:text-left">
          © {new Date().getFullYear()} DelhiDwarka. Made for the Dwarka community.
        </p>
      </div>
    </footer>
  );
}
