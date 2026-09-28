// Small shared helpers for building schema.org JSON-LD objects — kept
// separate from the pages that use them so the same shape (BreadcrumbList
// in particular) is identical everywhere it's used.
import { SITE_URL } from "@/lib/site";

export type BreadcrumbItem = {
  name: string;
  // Omit on the last (current-page) crumb — schema.org's own examples
  // leave the final item's url out rather than pointing it at itself.
  href?: string;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };
}
