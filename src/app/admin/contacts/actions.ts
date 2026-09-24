"use server";

// Server Actions for the admin contact-submissions viewer. Same auth model
// as src/app/admin/sectors/actions.ts — runs under the signed-in admin's
// session, so reads/deletes go through the "authenticated users
// read/delete contact submissions" RLS policies
// (supabase/migrations/0004_contact_submissions.sql).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContactSubmission } from "@/lib/supabase/types";

export async function listContactSubmissions(): Promise<ContactSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactSubmission[];
}

export async function bulkDeleteContactSubmissions(ids: string[]): Promise<{ deleted: number }> {
  if (ids.length === 0) return { deleted: 0 };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("contact_submissions")
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/contacts");
  return { deleted: count ?? ids.length };
}
