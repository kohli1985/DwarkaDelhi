"use client";

// Big, thumb-friendly Call / WhatsApp / Directions buttons for a listing's
// detail page. Each is a plain link (tel:, wa.me, or a Google Maps search
// URL) — clicking it navigates immediately; the click is logged in the
// background via trackListingClick and never blocks or delays that
// navigation. A button whose underlying data is missing (no usable phone,
// no address) is simply not rendered, rather than shown disabled — see
// src/app/listing/[slug]/page.tsx for how each href is built/omitted.
import { trackListingClick } from "@/app/listing/actions";
import type { ListingClickAction } from "@/lib/supabase/types";

type ActionButton = {
  action: ListingClickAction;
  label: string;
  href: string;
  icon: React.ReactNode;
};

export default function ListingActionButtons({
  listingId,
  callHref,
  whatsappHref,
  directionsHref,
}: {
  listingId: string;
  callHref: string | null;
  whatsappHref: string | null;
  directionsHref: string | null;
}) {
  const buttons: ActionButton[] = [];

  if (callHref) {
    buttons.push({
      action: "call",
      label: "Call",
      href: callHref,
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M3.654 1.328a.678.678 0 0 1 1.015-.063l2.443 2.443a.678.678 0 0 1 .063 1.015L5.5 6.354a10.5 10.5 0 0 0 8.146 8.146l1.63-1.675a.678.678 0 0 1 1.015.063l2.443 2.443a.678.678 0 0 1-.063 1.015l-2.223 2.223a1.5 1.5 0 0 1-1.34.42C8.607 17.9 2.1 11.393 1.011 4.891a1.5 1.5 0 0 1 .42-1.34L3.654 1.328Z" />
        </svg>
      ),
    });
  }

  if (whatsappHref) {
    buttons.push({
      action: "whatsapp",
      label: "WhatsApp",
      href: whatsappHref,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.28-1.38a9.87 9.87 0 0 0 4.71 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.13.11-1.82-.11a16.7 16.7 0 0 1-1.65-.61c-2.9-1.25-4.79-4.17-4.94-4.36-.15-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.09.2-.14.32-.28.49-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.61-.07.16-.2.7-.81.89-1.09.19-.28.37-.23.63-.14.26.09 1.66.78 1.94.93.28.14.47.21.53.33.07.12.07.68-.17 1.35Z" />
        </svg>
      ),
    });
  }

  if (directionsHref) {
    buttons.push({
      action: "directions",
      label: "Directions",
      href: directionsHref,
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M9.69 18.933a.75.75 0 0 0 .62 0l6.5-3.25A.75.75 0 0 0 17.25 15V6a.75.75 0 0 0-1.03-.696L10 8.014 3.78 5.304A.75.75 0 0 0 2.75 6v9c0 .285.161.546.44.683l6.5 3.25ZM10.75 9.36v7.53l5-2.5V6.86l-5 2.5Z"
            clipRule="evenodd"
          />
        </svg>
      ),
    });
  }

  if (buttons.length === 0) return null;

  function handleClick(action: ListingClickAction) {
    // Fire-and-forget — the anchor's default navigation (tel:/wa.me/maps)
    // proceeds immediately regardless of how long (or whether) this
    // resolves.
    trackListingClick(listingId, action).catch(() => {});
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {buttons.map((b) => (
        <a
          key={b.action}
          href={b.href}
          target={b.action === "directions" ? "_blank" : undefined}
          rel={b.action === "directions" ? "noopener noreferrer" : undefined}
          onClick={() => handleClick(b.action)}
          className="flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-dark active:bg-brand-dark sm:py-3.5"
        >
          {b.icon}
          {b.label}
        </a>
      ))}
    </div>
  );
}
