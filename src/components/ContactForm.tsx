"use client";

import { useState, useTransition } from "react";
import { submitContactForm } from "@/app/contact/actions";

export default function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await submitContactForm(formData);
      setResult(res.success ? { success: true } : { success: false, error: res.error });
    });
  }

  if (result?.success) {
    return (
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-8 text-center">
        <p className="text-base font-semibold text-foreground">Thanks for reaching out!</p>
        <p className="mt-2 text-sm text-foreground/70">
          We&apos;ve received your message and sent a confirmation to your email — we&apos;ll get
          back to you soon.
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-4 text-sm font-medium text-brand-dark hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name" required>
        <input name="name" required className={inputClass} />
      </Field>

      <Field label="Email" required>
        <input type="email" name="email" required className={inputClass} />
      </Field>

      <Field label="Phone">
        <input type="tel" name="phone" className={inputClass} />
      </Field>

      <Field label="Message" required>
        <textarea name="message" required rows={4} className={inputClass} />
      </Field>

      {result?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {result.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-brand";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-foreground/80">
      {label}
      {required && <span className="text-brand"> *</span>}
      {children}
    </label>
  );
}
