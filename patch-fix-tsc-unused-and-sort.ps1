# patch-fix-tsc-unused-and-sort.ps1
# Fixes TypeScript build errors caused by previous UI patches:
# - Restores Action Plan sort state + persistence
# - Ensures sortedActionPlanRows is defined in-scope and used by ActionPlanTable
# - Removes/adjusts unused imports and unused locals flagged by noUnusedLocals
# UI-only. No engine changes.

$ErrorActionPreference = "Stop"

function Backup-File($file) {
  $ts = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $file ($file + ".bak_tscfix_" + $ts) -Force
}

# -----------------------------
# 1) QuoteCalc.tsx: fix sorting + unused locals/imports
# -----------------------------
$qc = "src/pages/QuoteCalc.tsx"
if (!(Test-Path $qc)) { throw "Missing: $qc" }
Backup-File $qc

$s = Get-Content $qc -Raw

# 1A) Remove default React import (new JSX transform)
# from: import React, { useEffect, useMemo, useState } from "react";
# to:   import { useEffect, useMemo, useState } from "react";
$s = $s -replace 'import\s+React\s*,\s*\{\s*([^}]*)\s*\}\s*from\s*"react";', 'import { $1 } from "react";'

# 1B) Ensure @mui/material import includes MenuItem (needed for select)
if ($s -notmatch '\bMenuItem\b') {
  $rxMui = [regex]'import\s*\{\s*([^}]*)\s*\}\s*from\s*"@mui/material";'
  $mMui = $rxMui.Match($s)
  if ($mMui.Success) {
    $inner = $mMui.Groups[1].Value.Trim()
    if ($inner -notmatch "(^|,)\s*MenuItem(\s*,|$)") {
      $newInner = "$inner, MenuItem"
      $s = $rxMui.Replace($s, "import { $newInner } from `"@mui/material`";", 1)
    }
  } else {
    throw "Could not find @mui/material import to add MenuItem."
  }
}

# 1C) Remove unused toggleResolveGap function block entirely (best-effort)
# function toggleResolveGap(id: string) { ... }
$s = [regex]::Replace($s, '(?s)\r?\n\s*function\s+toggleResolveGap\s*\([^)]*\)\s*\{.*?\r?\n\s*\}\r?\n', "`r`n", 1)

# 1D) Ensure ACTIONPLAN_SORT_KEY is present AND used (localStorage persistence)
# If key exists but state is missing, restore state block after LAST_INPUT_KEY section header.
if ($s -notmatch 'const\s+ACTIONPLAN_SORT_KEY\s*=') {
  # Insert near top helpers (after existing helper types if present)
  $imports = [regex]::Match($s, "(?s)^(?:import[^\r\n]*\r?\n)+")
  if (-not $imports.Success) { throw "Could not find import block." }
  $s = $s.Insert($imports.Length, "`r`nconst ACTIONPLAN_SORT_KEY = `"drones_calc.actionPlan.sortMode`";`r`n")
}

# Ensure ActionPlanSortMode type exists
if ($s -notmatch 'type\s+ActionPlanSortMode\s*=') {
  $imports = [regex]::Match($s, "(?s)^(?:import[^\r\n]*\r?\n)+")
  if (-not $imports.Success) { throw "Could not find import block." }
  $s = $s.Insert($imports.Length, "`r`ntype ActionPlanSortMode = `"DEFAULT_P0`" | `"SCORE_DESC`" | `"TITLE_ASC`" | `"ORIGINAL`";`r`n")
}

# Ensure sortActionPlanRows exists
if ($s -notmatch 'function\s+sortActionPlanRows\s*\(') {
  # Insert helper functions after the ActionPlanSortMode line
  $anchor = [regex]::Match($s, 'type\s+ActionPlanSortMode\s*=\s*[^;]+;\s*\r?\n')
  if (-not $anchor.Success) { throw "Could not find ActionPlanSortMode anchor to insert sort helpers." }

  $helpers = @"
function apNormalizePriority(v: any): number {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return 99;
  if (s === "P0" || s === "0") return 0;
  if (s === "P1" || s === "1") return 1;
  if (s === "P2" || s === "2") return 2;
  if (s === "P3" || s === "3") return 3;
  if (s === "CRITICAL") return 0;
  if (s === "HIGH") return 1;
  if (s === "MED" || s === "MEDIUM") return 2;
  if (s === "LOW") return 3;
  return 99;
}

function apTitle(r: any): string {
  return String(r?.title ?? r?.gap ?? r?.name ?? r?.label ?? "Action Item");
}

function apPriorityRaw(r: any): any {
  return (r?.priority ?? r?.gapPriority ?? r?.prio ?? r?.severity ?? r?.level ?? null);
}

function apScore(r: any): number {
  const n = Number(r?.score ?? r?.risk_score ?? r?.riskScore ?? r?.impact ?? r?.weight ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function sortActionPlanRows(rows: any[], mode: ActionPlanSortMode): any[] {
  const arr = Array.isArray(rows) ? [...rows] : [];
  if (mode === "ORIGINAL") return arr;
  if (mode === "TITLE_ASC") return arr.sort((a,b) => apTitle(a).localeCompare(apTitle(b)));
  if (mode === "SCORE_DESC") return arr.sort((a,b) => apScore(b) - apScore(a));
  // DEFAULT_P0
  return arr.sort((a,b) => {
    const pa = apNormalizePriority(apPriorityRaw(a));
    const pb = apNormalizePriority(apPriorityRaw(b));
    if (pa !== pb) return pa - pb;
    const sa = apScore(a);
    const sb = apScore(b);
    if (sa !== sb) return sb - sa;
    return apTitle(a).localeCompare(apTitle(b));
  });
}
"@
  $s = $s.Insert($anchor.Index + $anchor.Length, "`r`n$helpers`r`n")
}

# 1E) Ensure actionPlanSortMode state exists inside QuoteCalc()
if ($s -notmatch '\[\s*actionPlanSortMode\s*,\s*setActionPlanSortMode\s*\]') {
  $mFn = [regex]::Match($s, "export\s+default\s+function\s+QuoteCalc\s*\(\)\s*\{\s*\r?\n")
  if (-not $mFn.Success) { throw "Could not find QuoteCalc() function header." }

  $state = @"
  // -------------------------
  // Action Plan sorting (UI)
  // -------------------------
  const [actionPlanSortMode, setActionPlanSortMode] = useState<ActionPlanSortMode>(() => {
    try {
      const saved = localStorage.getItem(ACTIONPLAN_SORT_KEY) as ActionPlanSortMode | null;
      return saved ?? "DEFAULT_P0";
    } catch {
      return "DEFAULT_P0";
    }
  });

  useEffect(() => {
    try { localStorage.setItem(ACTIONPLAN_SORT_KEY, actionPlanSortMode); } catch {}
  }, [actionPlanSortMode]);

"@
  $s = $s.Insert($mFn.Index + $mFn.Length, $state)
}

# 1F) Ensure sortedActionPlanRows memo exists and uses simulatedActionRows (NOT actionPlanRows)
# Remove any existing sortedActionPlanRows memo blocks then reinsert after simulatedActionRows declaration.
$s = [regex]::Replace($s, '(?s)\r?\n\s*const\s+sortedActionPlanRows\s*=\s*useMemo\(\(\)\s*=>.*?\);\s*\r?\n', "`r`n", 1)

$rxSim = [regex]'(\r?\n)(\s*const\s+simulatedActionRows\s*=\s*[\s\S]*?;\s*)(\r?\n)'
$msim = $rxSim.Match($s)
if (-not $msim.Success) { throw "Could not find simulatedActionRows declaration to anchor memo insertion." }

$indent = ""
if ($msim.Groups[2].Value -match '^(\s*)const\s+simulatedActionRows') { $indent = $Matches[1] }

$memo = @"
${indent}const sortedActionPlanRows = useMemo(() => {
${indent}  return sortActionPlanRows(simulatedActionRows ?? [], actionPlanSortMode);
${indent}}, [simulatedActionRows, actionPlanSortMode]);

"@
$insertPos = $msim.Index + $msim.Length
$s = $s.Insert($insertPos, $memo)

# 1G) Rewire ActionPlanTable to use sortedActionPlanRows
$rxTable = [regex]'(<ActionPlanTable\b[^>]*\brows\s*=\s*)\{[^}]*\}'
$mt = $rxTable.Match($s)
if (-not $mt.Success) { throw "Could not find rows={...} on <ActionPlanTable ...>." }
$s = $rxTable.Replace($s, $mt.Groups[1].Value + "{sortedActionPlanRows}", 1)

# 1H) Ensure dropdown exists (insert once above ActionPlanTable)
if ($s -notmatch 'aria-label="Action Plan sort"') {
  $ctrl = @(
    '      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1 }}>',
    '        <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>Action Plan</Typography>',
    '        <TextField',
    '          select',
    '          size="small"',
    '          value={actionPlanSortMode}',
    '          onChange={(e) => setActionPlanSortMode(e.target.value as ActionPlanSortMode)}',
    '          label="Sort"',
    '          aria-label="Action Plan sort"',
    '          sx={{ minWidth: 220 }}',
    '        >',
    '          <MenuItem value="DEFAULT_P0">Default (P0 first)</MenuItem>',
    '          <MenuItem value="SCORE_DESC">Score (high → low)</MenuItem>',
    '          <MenuItem value="TITLE_ASC">Title (A → Z)</MenuItem>',
    '          <MenuItem value="ORIGINAL">Original</MenuItem>',
    '        </TextField>',
    '      </Box>',
    ''
  ) -join "`r`n"

  $idx = $s.IndexOf("<ActionPlanTable")
  if ($idx -lt 0) { throw "Internal: ActionPlanTable index not found for dropdown insertion." }
  $lineStart = $s.LastIndexOf("`n", $idx)
  if ($lineStart -lt 0) { $lineStart = 0 } else { $lineStart = $lineStart + 1 }
  $s = $s.Insert($lineStart, $ctrl)
}

Set-Content -Path $qc -Value $s -Encoding UTF8
"QuoteCalc.tsx patched"

# -----------------------------
# 2) UI components: remove unused React default imports and unused helpers
# -----------------------------

# ActionPlanTable.tsx: remove unused React import if present
$ap = "src/ui/components/ActionPlanTable.tsx"
if (Test-Path $ap) {
  Backup-File $ap
  $t = Get-Content $ap -Raw
  $t = $t -replace '^\s*import\s+React\s+from\s+"react";\s*\r?\n', ''
  Set-Content -Path $ap -Value $t -Encoding UTF8
  "ActionPlanTable.tsx patched"
}

# FiltersBar.tsx: remove unused React import if present
$fb = "src/ui/components/FiltersBar.tsx"
if (Test-Path $fb) {
  Backup-File $fb
  $t = Get-Content $fb -Raw
  $t = $t -replace '^\s*import\s+React\s+from\s+"react";\s*\r?\n', ''
  Set-Content -Path $fb -Value $t -Encoding UTF8
  "FiltersBar.tsx patched"
}

# SnapshotBar.tsx: remove default React import, keep hooks, remove unused helpers nowIso/makeId
$sb = "src/ui/components/SnapshotBar.tsx"
if (Test-Path $sb) {
  Backup-File $sb
  $t = Get-Content $sb -Raw
  # import React, { useMemo, useState } from "react"; -> import { useMemo, useState } from "react";
  $t = $t -replace 'import\s+React\s*,\s*\{\s*([^}]*)\s*\}\s*from\s*"react";', 'import { $1 } from "react";'
  # remove: function nowIso(){...}  and function makeId(){...}
  $t = [regex]::Replace($t, '(?s)^\s*function\s+nowIso\s*\(\)\s*\{.*?\}\s*\r?\n', '', 'Multiline')
  $t = [regex]::Replace($t, '(?s)^\s*function\s+makeId\s*\(\)\s*\{.*?\}\s*\r?\n', '', 'Multiline')
  Set-Content -Path $sb -Value $t -Encoding UTF8
  "SnapshotBar.tsx patched"
}

"All patches applied."