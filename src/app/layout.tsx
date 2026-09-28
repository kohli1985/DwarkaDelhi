import type { Metadata } from "next";
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
