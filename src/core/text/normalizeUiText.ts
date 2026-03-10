/**
 * normalizeUiText
 * Goal: prevent mojibake / bad-encoded punctuation from leaking into UI.
 * ASCII-only source file (IMPORTANT): do not include any suspicious characters in this file itself.
 */
export function normalizeUiText(input: unknown, fallback = "—"): string {
  const t = String(input ?? "").trim();
  if (!t) return fallback;

  // Quick bail: if we see typical mojibake lead bytes rendered as Latin-1
  // (e.g., sequences that often indicate mojibake), return fallback.
  // NOTE: We intentionally match by ASCII-only patterns.
  // ASCII-only mojibake detection: look for typical lead bytes (0xC3, 0xC2, 0xE2) rendered as chars.
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c === 0x00C3 || c === 0x00C2 || c === 0x00E2) return fallback;
  }

  // Replace common “smart punctuation” with safe ASCII equivalents.
  // We use codepoints via \u escapes to keep this file ASCII-clean.
  return t
    // en dash, em dash, minus-like
    .replace(/\u2013|\u2014/g, "-")
    // ellipsis
    .replace(/\u2026/g, "...")
    // curly single quotes
    .replace(/\u2018|\u2019/g, "'")
    // curly double quotes
    .replace(/\u201C|\u201D/g, '"')
    // narrow no-break space and no-break space -> normal space
    .replace(/\u202F|\u00A0/g, " ")
    // collapse weird whitespace
    .replace(/\s+/g, " ")
    .trim();
}

