"use client";

// Sortable per-listing stats table. Plain client-side sort on an already-
// fetched (server-rendered) dataset — no re-fetching, just re-ordering the
// rows already on the page.
import { useMemo, useState } from "react";
import type { ListingStatsRow } from "./actions";

type SortKey = "name" | "category" | "sector" | "views" | "calls" | "whatsapp" | "directions";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Listing" },
  { key: "category", label: "Category" },
  { key: "sector", label: "Sector" },
  { key: "views", label: "Views" },
  { key: "calls", label: "Calls" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "directions", label: "Directions" },
];

export default function ListingStatsTable({ rows }: { rows: ListingStatsRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDesc ? -cmp : cmp;
    });
    return copy;
  }, [rows, sortKey, sortDesc]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(key !== "name" && key !== "category");
    }
  }

  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-foreground/60">No listing activity recorded yet.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-foreground/[0.03] text-xs uppercase tracking-wide text-foreground/50">
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key} className="px-4 py-2 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort(col.key)}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  {col.label}
                  {sortKey === col.key && <span>{sortDesc ? "↓" : "↑"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {sorted.map((r) => (
            <tr key={r.listingId}>
              <td className="px-4 py-2 font-medium text-foreground">{r.name}</td>
              <td className="px-4 py-2 text-foreground/70">{r.category}</td>
              <td className="px-4 py-2 text-foreground/70">{r.sector}</td>
              <td className="px-4 py-2 tabular-nums text-foreground/70">{r.views}</td>
              <td className="px-4 py-2 tabular-nums text-foreground/70">{r.calls}</td>
              <td className="px-4 py-2 tabular-nums text-foreground/70">{r.whatsapp}</td>
              <td className="px-4 py-2 tabular-nums text-foreground/70">{r.directions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
