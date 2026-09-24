// Thank-you email for contact form submissions (src/app/contact/actions.ts).
// Uses Resend (resend.com) — a REST API, so no SMTP setup needed.
//
// Email is optional at runtime, same pattern as ANTHROPIC_API_KEY elsewhere
// in this app: if RESEND_API_KEY isn't set, this just logs and returns —
// the submission itself is still saved to the DB either way (see
// submitContactForm), so nothing is lost, only the confirmation email.
//
// Note: until you verify a sending domain in Resend, their default
// `onboarding@resend.dev` sender can only deliver to the email address on
// your own Resend account — not to arbitrary visitors. To actually email
// submitters, verify a domain (e.g. delhidwarka.in) in the Resend
// dashboard and set CONTACT_FROM_EMAIL to an address on it.
import { Resend } from "resend";

const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "DelhiDwarka <onboarding@resend.dev>";

export async function sendThankYouEmail(to: string, name: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping thank-you email to", to);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Thanks for reaching out — DelhiDwarka",
    text: `Hi ${name},\n\nThanks for getting in touch with DelhiDwarka! We've received your message and will get back to you soon.\n\n— The DelhiDwarka team`,
  });

  if (error) throw new Error(error.message);
}
