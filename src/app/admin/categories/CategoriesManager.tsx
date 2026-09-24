"use client";

import { Fragment, useState, useTransition } from "react";
import type { Category } from "@/lib/supabase/types";
import { createCategory, bulkDeleteCategories, type CategoryDeleteResult } from "./actions";
import { useToast } from "@/components/Toast";

type Group = { top: Category; children: Category[] };

export default function CategoriesManager({ groups }: { groups: Group[] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLevel, setAddLevel] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteResult, setDeleteResult] = useState<CategoryDeleteResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const { show } = useToast();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createCategory(formData);
        setShowAddForm(false);
        show("Category added");
      } catch (err) {
        show(err instanceof Error ? err.message : "Couldn't add category", "error");
      }
    });
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} categor${selected.size === 1 ? "y" : "ies"}? Deleting a category also deletes its subcategories. This can't be undone.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await bulkDeleteCategories(Array.from(selected));
      setDeleteResult(result);
      setSelected(new Set());
      show(
        `${result.deleted} categor${result.deleted === 1 ? "y" : "ies"} deleted${
          result.blocked.length > 0 ? `, ${result.blocked.length} blocked` : ""
        }`,
        result.blocked.length > 0 ? "error" : "success",
      );
    });
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          {showAddForm ? "Cancel" : "+ New category"}
        </button>

        {selected.size > 0 && (
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Deleting…" : `Delete selected (${selected.size})`}
          </button>
        )}
      </div>

      {showAddForm && (
        <form
          action={handleAddSubmit}
          className="mt-4 flex flex-wrap items-end gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-5"
        >
          <label className="text-sm font-medium text-foreground/80">
            Level
            <select
              name="level"
              value={addLevel}
              onChange={(e) => setAddLevel(Number(e.target.value) as 1 | 2)}
              className={selectClass}
            >
              <option value={1}>Category (L1)</option>
              <option value={2}>Subcategory (L2)</option>
            </select>
          </label>

          {addLevel === 2 && (
            <label className="text-sm font-medium text-foreground/80">
              Parent category
              <select name="parent_id" required defaultValue="" className={selectClass}>
                <option value="" disabled>
                  Select a category
                </option>
                {groups.map(({ top }) => (
                  <option key={top.id} value={top.id}>
                    {top.emoji} {top.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm font-medium text-foreground/80">
            Name
            <input name="name" required className={inputClass} />
          </label>

          {addLevel === 1 && (
            <label className="text-sm font-medium text-foreground/80">
              Emoji
              <input name="emoji" placeholder="🍽️" className={`${inputClass} w-16 text-center`} />
            </label>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {deleteResult && (
        <div className="mt-4 rounded-xl border border-foreground/10 bg-background p-4 text-sm">
          <p className="font-medium text-foreground">
            {deleteResult.deleted} categor{deleteResult.deleted === 1 ? "y" : "ies"} deleted.
          </p>
          {deleteResult.blocked.length > 0 && (
            <ul className="mt-2 space-y-1 text-red-600">
              {deleteResult.blocked.map((b) => (
                <li key={b.name}>
                  {b.name}: not deleted — {b.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 bg-foreground/[0.02] text-foreground/60">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ top, children }) => (
              <Fragment key={top.id}>
                <tr className="border-b border-foreground/5">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(top.id)}
                      onChange={() => toggle(top.id)}
                      className="h-4 w-4 rounded border-foreground/30"
                      aria-label={`Select ${top.name}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {top.emoji} {top.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground/50">{top.slug}</td>
                </tr>
                {children.map((c) => (
                  <tr key={c.id} className="border-b border-foreground/5 last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 rounded border-foreground/30"
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 pl-10 text-foreground/80">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground/50">{c.slug}</td>
                  </tr>
                ))}
              </Fragment>
            ))}

            {groups.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-foreground/50">
                  No categories yet — add one above or bulk upload a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1.5 block rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-brand";
const selectClass = inputClass;
