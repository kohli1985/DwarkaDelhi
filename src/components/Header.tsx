import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-background/80 backdrop-blur-md dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            D
          </span>
          DelhiDwarka
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/70 sm:flex">
          <Link href="/#about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/#services" className="transition-colors hover:text-foreground">
            Services
          </Link>
          <Link href="/#contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
        </nav>
        <Link
          href="/#contact"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Get in touch
        </Link>
      </div>
    </header>
  );
}
