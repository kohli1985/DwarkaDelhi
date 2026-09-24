// Browser-side Supabase client — safe to use in Client Components.
// Uses the public anon key; access is governed by Row Level Security policies
// (see supabase/migrations/0001_init.sql).
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
