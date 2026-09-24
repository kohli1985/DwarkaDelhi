// Hand-written types matching supabase/migrations/0001_init.sql,
// 0002_category_hierarchy.sql, 0003_sectors.sql,
// 0004_contact_submissions.sql, 0005_sector_coordinates.sql and
// 0007_apartments.sql and 0008_apartment_address.sql.
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

export function sortSectors(sectors: Sector[]): Sector[] {
  return [...sectors].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
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

export type ListingInput = Omit<
  Listing,
  "id" | "search_text" | "embedding" | "created_at" | "updated_at"
>;

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
