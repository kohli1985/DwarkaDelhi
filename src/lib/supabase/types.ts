// Hand-written types matching supabase/migrations/0001_init.sql,
// 0002_category_hierarchy.sql, 0003_sectors.sql,
// 0004_contact_submissions.sql, 0005_sector_coordinates.sql,
// 0007_apartments.sql, 0008_apartment_address.sql, 0009_listing_slug.sql
// and 0010_listing_click_events.sql.
// If the schema changes, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type Category = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  parent_id: string | null; // null for L1 (top-level), set for L2 (subcategory)
  level: 1 | 2;
  created_at: string;
};

// A subcategory (L2) is what listings actually store as category_id — this
// alias documents that intent at call sites without adding a new shape.
export type Subcategory = Category & { level: 2; parent_id: string };
export type TopCategory = Category & { level: 1; parent_id: null };

// Groups a flat categories list into L1s, each with its L2 children —
// the shape the homepage browse UI and the admin category picker both want.
export function groupCategories(categories: Category[]): {
  top: Category;
  children: Category[];
}[] {
  const tops = categories
    .filter((c) => c.level === 1)
    .sort((a, b) => a.sort_order - b.sort_order);
  return tops.map((top) => ({
    top,
    children: categories
      .filter((c) => c.level === 2 && c.parent_id === top.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

// Sectors are a managed table (supabase/migrations/0003_sectors.sql), not a
// hardcoded list — the admin adds/hides/deletes them from /admin/sectors.
// `is_active` controls public visibility (search filter chips, etc.); the
// admin can still assign listings to an inactive sector while prepping it.
export type Sector = {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  // Optional — set from /admin/sectors. Used to rank search results by
  // distance from a searched sector (see src/app/api/search/route.ts);
  // a sector with no coordinates just falls back to similarity-only order.
  latitude: number | null;
  longitude: number | null;
};

// Sectors 4, 5, 6, 10 and 12 were the five the site originally launched
// with (see supabase/migrations/0003_sectors.sql) and stay pinned first,
// in that order; every sector added since (via /admin/sectors) sorts
// after them by sector number. `sort_order` on the sectors table reflects
// the order sectors were added in the admin bulk-add form, not the sector
// number, so it isn't a usable sort key on its own — it's why the sector
// nav used to show something like "4, 5, 6, 10, 12, 7, 8, 9, 18, 11…"
// instead of ascending order.
const PRIORITY_SECTOR_IDS = [4, 5, 6, 10, 12];

export function sortSectors(sectors: Sector[]): Sector[] {
  function priority(id: number): number {
    const rank = PRIORITY_SECTOR_IDS.indexOf(id);
    return rank === -1 ? Number.POSITIVE_INFINITY : rank;
  }
  return [...sectors].sort((a, b) => priority(a.id) - priority(b.id) || a.id - b.id);
}

// Apartments/societies within a sector — optional, admin-managed, used to
// give queries that name a landmark ("near Sai CGHS") the same
// distance-based ranking sector numbers already get (see
// supabase/migrations/0007_apartments.sql and src/lib/apartments.ts).
export type Apartment = {
  id: string;
  name: string;
  sector_id: number;
  address: string | null;
  is_active: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  name: string;
  // URL slug for /listing/[slug] (supabase/migrations/0009_listing_slug.sql)
  // — generated once at creation (src/lib/slug.ts) and left null only for
  // rows created before that migration, until the backfill script runs
  // (scripts/backfill-listing-slugs.mjs).
  slug: string | null;
  category_id: string;
  description: string;
  sector: number; // references sectors.id
  address: string | null;
  landmark: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  hours_text: string | null;
  price_range: string | null;
  search_text: string;
  embedding: number[] | null;
  is_published: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

// slug is generated separately (src/lib/slug.ts) at creation time, not
// taken from the admin form — kept out of ListingInput the same way
// search_text/embedding are.
export type ListingInput = Omit<
  Listing,
  "id" | "slug" | "search_text" | "embedding" | "created_at" | "updated_at"
>;

// slug IS included (not omitted) — match_listings now returns it (see
// supabase/migrations/0009_listing_slug.sql) so search result cards can
// link to the listing's detail page.
export type MatchListingsRow = Omit<
  Listing,
  "search_text" | "embedding" | "is_published" | "featured" | "created_at" | "updated_at" | "instagram"
> & { similarity: number };

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
};

// Click events on a listing detail page's Call/WhatsApp/Directions buttons
// (supabase/migrations/0010_listing_click_events.sql) — anonymous, insert-
// only from the public site; read by the admin later to show a business how
// many enquiries their listing gets.
// "view" added alongside call/whatsapp/directions by
// supabase/migrations/0012_extend_listing_events.sql (proposed, awaiting
// approval — see that file) — a page view logged from
// src/app/listing/[slug]/page.tsx the same way a button click is.
export type ListingClickAction = "view" | "call" | "whatsapp" | "directions";

export type ListingClickEvent = {
  id: string;
  listing_id: string;
  action: ListingClickAction;
  // Both added by 0012_extend_listing_events.sql — null on rows written
  // before that migration runs.
  source_page: string | null;
  session_id: string | null;
  created_at: string;
};

// Anonymous search-query log (supabase/migrations/0013_search_logs.sql,
// proposed, awaiting approval) — written by src/app/api/search/route.ts
// after every search, read by the admin stats page. No IPs, no user
// agents, no identifiers.
export type SearchLog = {
  id: string;
  query: string;
  sector_filter: number | null;
  result_count: number;
  top_score: number | null;
  zero_results: boolean;
  created_at: string;
};

// Minimal Database type so the Supabase client stays type-safe without
// generating the full CLI output (see note above to regenerate for real).
export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Partial<Category> & Pick<Category, "slug" | "name">;
        Update: Partial<Category>;
        Relationships: [];
      };
      listings: {
        Row: Listing;
        Insert: Partial<Listing> & Pick<Listing, "name" | "category_id" | "sector"> & { embedding?: number[] | null };
        Update: Partial<Listing> & { embedding?: number[] | null };
        Relationships: [];
      };
      listing_click_events: {
        Row: ListingClickEvent;
        Insert: Partial<ListingClickEvent> & Pick<ListingClickEvent, "listing_id" | "action">;
        Update: Partial<ListingClickEvent>;
        Relationships: [];
      };
      sectors: {
        Row: Sector;
        Insert: Partial<Sector> & Pick<Sector, "id" | "name">;
        Update: Partial<Sector>;
        Relationships: [];
      };
      apartments: {
        Row: Apartment;
        Insert: Partial<Apartment> & Pick<Apartment, "name" | "sector_id">;
        Update: Partial<Apartment>;
        Relationships: [];
      };
      contact_submissions: {
        Row: ContactSubmission;
        Insert: Partial<ContactSubmission> & Pick<ContactSubmission, "name" | "email" | "message">;
        Update: Partial<ContactSubmission>;
        Relationships: [];
      };
      search_logs: {
        Row: SearchLog;
        Insert: Partial<SearchLog> & Pick<SearchLog, "query">;
        Update: Partial<SearchLog>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_listings: {
        Args: {
          query_embedding: number[];
          match_count: number | null;
          filter_sector: number | null;
          filter_category_id: string | null;
        };
        Returns: MatchListingsRow[];
      };
    };
  };
};
