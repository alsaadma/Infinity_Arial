export type CommandGapStatus = "Open" | "In Progress" | "Mitigated";

// Backward compatible keys (keep your existing localStorage data)
const statusKey = (gapId: string) => "dc:gapStatus:" + gapId;
const ownerKey  = (gapId: string) => "dc:gapOwner:" + gapId;

export function readGapStatus(gapId: string): CommandGapStatus {
  try {
    const v = String(localStorage.getItem(statusKey(gapId)) ?? "").trim();
    if (v === "Open" || v === "In Progress" || v === "Mitigated") return v as CommandGapStatus;
  } catch {}
  return "Open";
}

export function nextGapStatus(s: CommandGapStatus): CommandGapStatus {
  return s === "Open" ? "In Progress" : s === "In Progress" ? "Mitigated" : "Open";
}

export function writeGapStatus(gapId: string, s: CommandGapStatus): void {
  try { localStorage.setItem(statusKey(gapId), s); } catch {}
}

export function readGapOwner(gapId: string): string | null {
  try {
    const v = String(localStorage.getItem(ownerKey(gapId)) ?? "").trim();
    return v.length ? v : null;
  } catch {
    return null;
  }
}

export function writeGapOwner(gapId: string, owner: string | null): void {
  try {
    const key = ownerKey(gapId);
    if (!owner || !owner.trim().length) localStorage.removeItem(key);
    else localStorage.setItem(key, owner.trim());
  } catch {}
}

export function promptGapOwner(gapId: string): void {
  const current = readGapOwner(gapId) ?? "AUTO";
  const next = window.prompt("Owner override (blank = AUTO):", current === "AUTO" ? "" : current);
  if (next === null) return;
  const trimmed = String(next ?? "").trim();
  writeGapOwner(gapId, trimmed.length ? trimmed : null);
}