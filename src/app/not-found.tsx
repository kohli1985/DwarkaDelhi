import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// App Router's file convention: rendered automatically for any route that
// calls notFound() (every dynamic page in this app does — see
// src/app/listing/[slug]/page.tsx and friends) or that simply doesn't
// exist, replacing the generic default Next.js 404.
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center px-5 py-20 text-center">
        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">404</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-3 text-sm leading-6 text-foreground/60">
            It may have been moved, or the listing/sector/category it pointed to
            no longer exists. Try searching for what you need, or browse by category.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#search"
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Search DelhiDwarka
            </Link>
            <Link
              href="/"
              className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
            >
              Browse categories
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
