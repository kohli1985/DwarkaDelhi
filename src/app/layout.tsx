import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  // Lets per-page metadata (e.g. src/app/listing/[slug]/page.tsx's
  // canonical/openGraph urls) resolve as absolute URLs without repeating
  // the site origin everywhere.
  metadataBase: new URL(SITE_URL),
  title: "DelhiDwarka — Local Services for Dwarka, Delhi",
  description:
    "DelhiDwarka connects residents of Dwarka, Delhi with trusted local services and community resources — all in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // en-IN rather than plain en — the site, its content (Dwarka, Delhi
    // sector numbers, Indian phone formatting) and its audience are all
    // India-specific.
    <html lang="en-IN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        {/* Vercel Web Analytics — cookieless page-view tracking, no custom
            events (not available on the Hobby plan). Described to
            visitors on /privacy. */}
        <Analytics />
      </body>
    </html>
  );
}
