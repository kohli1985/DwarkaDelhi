import Link from "next/link";
import { signOut } from "./actions";
import { ToastProvider } from "@/components/Toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
    <div className="min-h-screen bg-foreground/[0.02]">
      <header className="border-b border-foreground/10 bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/admin" className="text-base font-semibold text-foreground">
            DelhiDwarka Admin
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="text-sm font-medium text-foreground/60 hover:text-foreground"
            >
              View site ↗
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-foreground/15 px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="border-b border-foreground/10 bg-background">
        <nav className="mx-auto flex max-w-5xl gap-6 px-5">
          <Link
            href="/admin"
            className="border-b-2 border-transparent py-3 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            Listings
          </Link>
          <Link
            href="/admin/categories"
            className="border-b-2 border-transparent py-3 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            Categories
          </Link>
          <Link
            href="/admin/sectors"
            className="border-b-2 border-transparent py-3 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            Sectors
          </Link>
          <Link
            href="/admin/apartments"
            className="border-b-2 border-transparent py-3 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            Apartments
          </Link>
          <Link
            href="/admin/contacts"
            className="border-b-2 border-transparent py-3 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            Messages
          </Link>
        </nav>
      </div>
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
    </ToastProvider>
  );
}
