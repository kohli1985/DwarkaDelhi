"use client";

import { useState, useTransition } from "react";
import type { ContactSubmission } from "@/lib/supabase/types";
import { bulkDeleteContactSubmissions } from "./actions";
import { useToast } from "@/components/Toast";

export default function ContactsTable({ submissions }: { submissions: ContactSubmission[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState(submissions);
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

  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((s) => s.id))));
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(`Delete ${selected.size} message${selected.size === 1 ? "" : "s"}? This can't be undone.`)
    )
      return;

    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkDeleteContactSubmissions(ids);
      setItems((prev) => prev.filter((s) => !ids.includes(s.id)));
      setSelected(new Set());
      show(`${ids.length} message${ids.length === 1 ? "" : "s"} deleted`);
    });
  }

  return (
    <div className="mt-8">
      {selected.size > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Deleting…" : `Delete selected (${selected.size})`}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 bg-foreground/[0.02] text-foreground/60">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-foreground/30"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-foreground/5 align-top last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4 rounded border-foreground/30"
                    aria-label={`Select message from ${s.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${s.email}`} className="text-brand-dark hover:underline">
                    {s.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-foreground/70">{s.phone || "—"}</td>
                <td className="max-w-sm px-4 py-3 whitespace-pre-wrap text-foreground/70">
                  {s.message}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-foreground/50">
                  {new Date(s.created_at).toLocaleString()}
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-foreground/50">
                  No messages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
