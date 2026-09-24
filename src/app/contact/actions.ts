"use server";

// Server Action backing the public contact form (src/components/ContactForm.tsx).
// Runs as whoever is calling it — usually an anonymous visitor — so the
// insert goes through the "anyone can submit a contact message" RLS policy
// (supabase/migrations/0004_contact_submissions.sql), not the admin's
// session. Sending the thank-you email is best-effort: a failed email
// never fails the submission, since the message is already safely stored
// and readable at /admin/contacts either way.
import { createClient } from "@/lib/supabase/server";
import { sendThankYouEmail } from "@/lib/email";

export type ContactFormResult = { success: true } | { success: false; error: string };

export async function submitContactForm(formData: FormData): Promise<ContactFormResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!name) return { success: false, error: "Name is required" };
  if (!email || !email.includes("@")) return { success: false, error: "A valid email is required" };
  if (!message) return { success: false, error: "Message is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("contact_submissions").insert({
    name,
    email,
    phone: phone || null,
    message,
  });

  if (error) {
    console.error("Failed to save contact submission:", error.message);
    return { success: false, error: "Couldn't send your message right now — please try again." };
  }

  try {
    await sendThankYouEmail(email, name);
  } catch (err) {
    console.error("Failed to send thank-you email:", err);
    // Not surfaced to the visitor — their message was saved successfully,
    // which is the part that actually matters.
  }

  return { success: true };
}
