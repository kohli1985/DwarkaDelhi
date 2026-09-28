// Shared phone normalization/formatting — every phone number is stored and
// displayed in one consistent shape ("+91 XXXXX XXXXX" for a 10-digit
// Indian mobile number), so imports/edits can't reintroduce inconsistently
// shaped raw values (e.g. a spreadsheet auto-typing the phone column as a
// number, producing "919818011664.0").

// Normalizes a raw phone value down to a bare digit string, or null if
// nothing usable remains. Used both at write time (storage) and read time
// (display formatting / building tel: and wa.me links), so there's exactly
// one place that decides what counts as "the phone number" out of messy
// input.
//
// Order matters: a spreadsheet-mangled value like "919818011664.0" must
// have its trailing ".0" stripped BEFORE non-digit characters are removed,
// or a naive digit-only regex would keep that trailing "0" as if it were a
// real digit.
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

// Formats a raw phone value for display: "+91 XXXXX XXXXX" for a
// confidently-10-digit Indian mobile number, or the cleaned digits-only
// string for anything else (e.g. a landline) — never discards the data or
// forces an incorrect shape. Returns null if nothing usable remains.
export function formatPhone(raw: string | null | undefined): string | null {
  const digits = normalizePhone(raw);
  if (!digits) return null;

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return digits;
}

// Builds the digits-only, country-code-prefixed number wa.me/tel: links
// need (e.g. "919818011664" — no "+", no spaces). Returns null unless the
// number confidently resolves to a 10-digit Indian mobile number — a
// wa.me link needs the country code, and we'd rather hide the WhatsApp
// button than guess a country code for an unrecognized number shape.
export function whatsAppNumber(raw: string | null | undefined): string | null {
  const digits = normalizePhone(raw);
  if (!digits || digits.length !== 10) return null;
  return `91${digits}`;
}

// Builds a tel: link target from a raw phone value. Uses whatever
// normalizePhone resolves to (10-digit mobile or the cleaned digits for
// anything else, e.g. a landline) rather than requiring the stricter
// 10-digit shape whatsAppNumber does — a landline should still be callable
// even though it can't be a WhatsApp number.
export function telHref(raw: string | null | undefined): string | null {
  const digits = normalizePhone(raw);
  if (!digits) return null;
  return `tel:+91${digits}`;
}
