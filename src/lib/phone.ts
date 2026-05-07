/**
 * Normalize school-entered or Clerk-supplied phone numbers to E.164 (+digits).
 * Supports Kenya-style local numbers (07… / 7…) when no country code is present.
 */
export function normalizePhoneE164(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = input.trim().replace(/\s+/g, "");
  if (!trimmed) {
    return { ok: false, error: "Phone is required." };
  }

  let digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly.length) {
    return { ok: false, error: "Phone must contain digits." };
  }

  // Kenya: 07XXXXXXXX or 7XXXXXXXX → +2547XXXXXXXX
  if (!digitsOnly.startsWith("254")) {
    if (digitsOnly.startsWith("0") && digitsOnly.length === 10 && digitsOnly[1] === "7") {
      digitsOnly = `254${digitsOnly.slice(1)}`;
    } else if (digitsOnly.length === 9 && digitsOnly[0] === "7") {
      digitsOnly = `254${digitsOnly}`;
    }
  }

  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return {
      ok: false,
      error: "Phone must be 8–15 digits including country code (e.g. +254712345678 or 0712345678).",
    };
  }

  return { ok: true, value: `+${digitsOnly}` };
}

/** Best-effort E.164 for Clerk identifiers; returns null if input is empty. */
export function tryNormalizePhoneE164(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const r = normalizePhoneE164(input);
  return r.ok ? r.value : null;
}
