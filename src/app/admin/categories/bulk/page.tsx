"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
  bulkCreateCategories,
  type CategoryBulkRow,
  type CategoryBulkResult,
} from "../actions";

const REQUIRED_COLUMNS = ["category"];

export default function CategoriesBulkUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<CategoryBulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<CategoryBulkResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const errors: string[] = [];
        const headers = results.meta.fields ?? [];
        const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          errors.push(`Missing required column(s): ${missing.join(", ")}`);
        }

        const parsedRows: CategoryBulkRow[] = results.data
          .filter((r) => (r.category || "").trim())
          .map((r) => ({
            category: r.category?.trim() ?? "",
            subcategory: r.subcategory?.trim() || undefined,
            emoji: r.emoji?.trim() || undefined,
          }));

        setRows(parsedRows);
        setParseErrors(errors);
      },
      error: (err) => {
        setParseErrors([`Couldn't read file: ${err.message}`]);
        setRows([]);
      },
    });
  }

  function handleUpload() {
    startTransition(async () => {
      const res = await bulkCreateCategories(rows);
      setResult(res);
      if (res.errors.length === 0) {
        setRows([]);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Bulk upload categories</h1>
        <Link
          href="/admin/categories"
          className="text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          ← Back to categories
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6">
        <p className="text-sm text-foreground/70">
          Upload a CSV with <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">category</code>{" "}
          (required), and optionally{" "}
          <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">subcategory</code> and{" "}
          <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">emoji</code>. This is
          additive only — existing categories are left untouched, and a row for a
          category/subcategory that already exists is simply skipped. Leave{" "}
          <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">subcategory</code> blank
          on a row to just ensure the category itself exists.
        </p>
        <a
          href="/delhidwarka-category-bulk-template.csv"
          download
          className="mt-3 inline-block text-sm font-semibold text-brand-dark hover:underline"
        >
          Download CSV template ↓
        </a>
      </div>

      <div className="mt-6 max-w-2xl">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="block w-full text-sm text-foreground/70 file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />

        {parseErrors.length > 0 && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {parseErrors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}

        {fileName && rows.length > 0 && parseErrors.length === 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-foreground">
              {fileName}: {rows.length} row{rows.length === 1 ? "" : "s"} parsed.
            </p>

            <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-foreground/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-foreground/[0.04] text-foreground/60">
                  <tr>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Subcategory</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r, i) => (
                    <tr key={i} className="border-t border-foreground/5">
                      <td className="px-3 py-1.5 text-foreground/80">{r.category}</td>
                      <td className="px-3 py-1.5 text-foreground/60">{r.subcategory ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 30 && (
              <p className="mt-1 text-xs text-foreground/50">
                +{rows.length - 30} more row{rows.length - 30 === 1 ? "" : "s"} not shown.
              </p>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={isPending}
              className="mt-4 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {isPending ? "Uploading…" : `Upload ${rows.length} row${rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-xl border border-foreground/10 bg-background p-5">
            <p className="text-sm font-semibold text-foreground">
              {result.createdL1} categor{result.createdL1 === 1 ? "y" : "ies"} and{" "}
              {result.createdL2} subcategor{result.createdL2 === 1 ? "y" : "ies"} created.
              {result.skipped > 0 && ` ${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped (already existed).`}
            </p>
            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-600">
                  {result.errors.length} row{result.errors.length === 1 ? "" : "s"} had errors:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-foreground/70">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link
              href="/admin/categories"
              className="mt-4 inline-block text-sm font-semibold text-brand-dark hover:underline"
            >
              View categories →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
