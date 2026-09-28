import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/site";

const TITLE = "Privacy | DelhiDwarka";
const DESCRIPTION =
  "How DelhiDwarka uses cookieless analytics and anonymous search/click logging to improve the directory.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/privacy`,
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Privacy</h1>
        <p className="mt-2 text-sm text-foreground/60">Last updated September 2026.</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-6 text-foreground/80">
          <p>
            DelhiDwarka is a local directory for Dwarka, Delhi. We keep the data we collect to the
            minimum needed to run the directory and understand whether it&apos;s actually useful —
            we don&apos;t sell data, run ads, or track people across other sites.
          </p>

          <section>
            <h2 className="text-base font-semibold text-foreground">Page analytics</h2>
            <p className="mt-2">
              We use{" "}
              <a
                href="https://vercel.com/docs/analytics"
                target="_blank"
                rel="noreferrer"
                className="text-brand underline hover:text-brand-dark"
              >
                Vercel Web Analytics
              </a>
              , which is cookieless: it doesn&apos;t set tracking cookies or build a profile of
              individual visitors. It gives us aggregate numbers like page views and which pages
              are popular.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Anonymous search &amp; click logging</h2>
            <p className="mt-2">
              To see what people are searching for — and where the directory comes up short — we
              log the text of each search, any sector filter applied, and how many results it
              returned. We also log when a listing is viewed, or its Call, WhatsApp or Directions
              button is used, so we can show a business roughly how much interest it&apos;s getting.
            </p>
            <p className="mt-2">
              These logs never include your IP address, browser/user-agent string, or any
              identifier tied to you personally. A short-lived, anonymous session marker is used
              only to avoid counting the same click twice within a few seconds — it isn&apos;t
              linked to any account or identity, and we don&apos;t use it to build a profile of
              individual visitors.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">What we don&apos;t do</h2>
            <p className="mt-2">
              We don&apos;t use Google Analytics or other third-party ad/tracking scripts, don&apos;t
              sell or share this data, and don&apos;t attempt to identify individual visitors from
              it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              Questions about this page? Reach us through the{" "}
              <Link href="/#contact" className="text-brand underline hover:text-brand-dark">
                contact form
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
