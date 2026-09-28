// Shared phone normalization/formatting — every phone number is stored and
// displayed in one consistent shape ("+91 XXXXX XXXXX" for a 10-digit
// Indian mobile number), so imports/edits can't reintroduce the
// inconsistently-shaped raw values seen in the live data (e.g.
// "919818011664.0" from a spreadsheet that auto-typed the phone column as
// a number before CSV export).

// Normalizes a raw phone value down to a bare digit string, or null if
// nothing usable remains. Used both at write time (storage) and read time
// (display formatting), so there's exactly one place that decides what
// counts as "the phone number" out of messy input.
//
// Order matters: a spreadsheet-mangled value like "919818011664.0" must
// have its trailing ".0" stripped BEFORE non-digit characters are removed,
// or a naive digit-only regex would keep that trailing "0" as if it were a
// real digit, producing a wrong 12th digit instead of a clean 91-prefixed
// number.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const withoutFloatSuffix = raw.trim().replace(/\.0+$/, "");
  const digits = withoutFloatSuffix.replace(/\D/g, "");
  if (!digits) return null;

  // Isolate a 10-digit Indian national number when we can recognize one:
  // strip a leading "91" country code (12 digits total) or a leading trunk
  // "0" (11 digits total). Anything else (landlines, already-10-digit
  // numbers, unrecognized shapes) passes through as-is rather than being
  // forced into a shape that might be wrong.
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

// Formats a raw phone value for storage/display: "+91 XXXXX XXXXX" for a
// confidently-10-digit Indian mobile number, or the cleaned digits-only
// string for anything else (e.g. a landline) — never discards the data or
// forces an incorrect shape. Returns null if nothing usable remains, so
// callers can fall back to "" / omit the field the same way they do today.
export function formatPhone(raw: string | null | undefined): string | null {
  const digits = normalizePhone(raw);
  if (!digits) return null;

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return digits;
}
