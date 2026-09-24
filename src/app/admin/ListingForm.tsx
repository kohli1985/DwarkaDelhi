"use client";

import { useState, useTransition } from "react";
import type { Category, Listing, Sector } from "@/lib/supabase/types";
import { groupCategories } from "@/lib/supabase/types";

type Props = {
  categories: Category[];
  sectors: Sector[];
  listing?: Listing;
  action: (formData: FormData) => Promise<void>;
};

export default function ListingForm({ categories, sectors, listing, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const groups = groupCategories(categories);

  // The listing stores only the leaf (L2) category_id — L1 here is purely a
  // client-side filter to narrow the L2 dropdown, derived from the existing
  // listing's subcategory on edit, or the first group by default.
  const initialL2 = categories.find((c) => c.id === listing?.category_id);
  const initialL1Id = initialL2?.parent_id ?? groups[0]?.top.id ?? "";
  const [selectedL1Id, setSelectedL1Id] = useState(initialL1Id);

  const activeGroup = groups.find((g) => g.top.id === selectedL1Id);

  function handleSubmit(formData: FormData) {
    startTransition(() => action(formData));
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required>
          <input
            name="name"
            required
            defaultValue={listing?.name}
            className={inputClass}
          />
        </Field>

        <Field label="Category (L1)" required>
          <select
            value={selectedL1Id}
            onChange={(e) => setSelectedL1Id(e.target.value)}
            className={inputClass}
          >
            {groups.map(({ top }) => (
              <option key={top.id} value={top.id}>
                {top.emoji} {top.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subcategory (L2)" required>
          <select
            name="category_id"
            required
            defaultValue={listing?.category_id}
            className={inputClass}
          >
            <option value="" disabled>
              Select a subcategory
            </option>
            {activeGroup?.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sector" required>
          <select
            name="sector"
            required
            defaultValue={listing?.sector ?? sectors[0]?.id}
            className={inputClass}
          >
            {sectors.length === 0 && (
              <option value="" disabled>
                No sectors yet — add one in Admin → Sectors
              </option>
            )}
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {!s.is_active ? " (hidden)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Phone">
          <input name="phone" defaultValue={listing?.phone ?? ""} className={inputClass} />
        </Field>

        <Field label="WhatsApp">
          <input
            name="whatsapp"
            defaultValue={listing?.whatsapp ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Website">
          <input name="website" defaultValue={listing?.website ?? ""} className={inputClass} />
        </Field>

        <Field label="Instagram">
          <input
            name="instagram"
            defaultValue={listing?.instagram ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Price range">
          <input
            name="price_range"
            placeholder="e.g. ₹500–1500/session"
            defaultValue={listing?.price_range ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Hours">
          <input
            name="hours_text"
            placeholder="e.g. Mon–Sat 9am–8pm"
            defaultValue={listing?.hours_text ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Landmark">
          <input
            name="landmark"
            placeholder="e.g. near Sector 10 metro station"
            defaultValue={listing?.landmark ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Address">
        <input name="address" defaultValue={listing?.address ?? ""} className={inputClass} />
      </Field>

      <Field label="Description" required>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={listing?.description}
          placeholder="What they offer, what makes them worth listing — this text also powers search."
          className={inputClass}
        />
      </Field>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={listing?.is_published ?? true}
            className="h-4 w-4 rounded border-foreground/30"
          />
          Published (visible on the site)
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={listing?.featured ?? false}
            className="h-4 w-4 rounded border-foreground/30"
          />
          Featured
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending || sectors.length === 0}
        className="w-fit rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "Saving…" : listing ? "Save changes" : "Create listing"}
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
