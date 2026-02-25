# patch-actionplan-sort.ps1
# UI-only patch for src/pages/QuoteCalc.tsx
# Adds: Action Plan sorting (P0 first), user override dropdown, remembered preference.
# Does NOT touch engine or calculation logic.

$ErrorActionPreference = "Stop"

$path = Join-Path (Resolve-Path ".").Path "src\pages\QuoteCalc.tsx"
if (-not (Test-Path $path)) { throw "File not found: $path" }

$ts  = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$path.bak_uipolish_sort2D_$ts"
Copy-Item $path $bak -Force

$src = Get-Content $path -Raw
if ($src.Length -lt 800) { throw "Refusing to patch: file too small ($($src.Length) chars)" }

function Ensure-ReactHookImport {
  param([string]$text, [string]$hook)

  # If already imported, do nothing
  if ($text -match "\b$hook\b") { return $text }

  # Match: import React, { ... } from "react";
  $rx = [regex]'import\s+React\s*,\s*\{\s*([^}]*)\s*\}\s*from\s*["'']react["''];'
  $m = $rx.Match($text)
  if ($m.Success) {
    $inner = $m.Groups[1].Value.Trim()
    if ($inner -notmatch "(^|,)\s*$hook(\s*,|$)") {
      $newInner = if ($inner) { "$inner, $hook" } else { $hook }
      return $rx.Replace($text, "import React, { $newInner } from `"react`";", 1)
    }
    return $text
  }

  # Match: import { ... } from "react";
  $rx2 = [regex]'import\s*\{\s*([^}]*)\s*\}\s*from\s*["'']react["''];'
  $m2 = $rx2.Match($text)
  if ($m2.Success) {
    $inner2 = $m2.Groups[1].Value.Trim()
    if ($inner2 -notmatch "(^|,)\s*$hook(\s*,|$)") {
      $newInner2 = if ($inner2) { "$inner2, $hook" } else { $hook }
      return $rx2.Replace($text, "import { $newInner2 } from `"react`";", 1)
    }
    return $text
  }

  # If no react import found, insert a minimal one at top (safe fallback)
  return "import { $hook } from `"react`";`r`n" + $text
}

# Ensure hooks exist (useEffect/useMemo/useState typically used already, but ensure)
$src = Ensure-ReactHookImport -text $src -hook "useEffect"
$src = Ensure-ReactHookImport -text $src -hook "useMemo"
$src = Ensure-ReactHookImport -text $src -hook "useState"

# 1) Insert helper block after imports (idempotent)
if ($src -notmatch "type\s+ActionPlanSortMode\s*=") {

  $helpers = @(
    'type ActionPlanSortMode = "DEFAULT_P0" | "SCORE_DESC" | "TITLE_ASC" | "ORIGINAL";',
    '',
    'const ACTIONPLAN_SORT_KEY = "drones_calc.actionPlan.sortMode";',
    '',
    'function normalizePriority(v: any): number {',
    '  const s = String(v ?? "").trim().toUpperCase();',
    '  if (!s) return 99;',
    '  if (s === "P0" || s === "0" || s.endsWith("_0")) return 0;',
    '  if (s === "P1" || s === "1" || s.endsWith("_1")) return 1;',
    '  if (s === "P2" || s === "2" || s.endsWith("_2")) return 2;',
    '  if (s === "P3" || s === "3" || s.endsWith("_3")) return 3;',
    '  if (s === "CRITICAL") return 0;',
    '  if (s === "HIGH") return 1;',
    '  if (s === "MED" || s === "MEDIUM") return 2;',
    '  if (s === "LOW") return 3;',
    '  return 99;',
    '}',
    '',
    'function getActionPlanTitle(x: any): string {',
    '  return String(x?.title ?? x?.gap ?? x?.gap_title ?? x?.name ?? x?.label ?? "Action Item");',
    '}',
    '',
    'function getActionPlanPriorityRaw(x: any): any {',
    '  return (x?.priority ?? x?.gapPriority ?? x?.prio ?? x?.p ?? x?.severity ?? x?.risk ?? x?.level ?? null);',
    '}',
    '',
    'function getActionPlanScore(x: any): number {',
    '  const n = Number(x?.score ?? x?.risk_score ?? x?.riskScore ?? x?.impact ?? x?.weight ?? x?.rank_score ?? 0);',
    '  return Number.isFinite(n) ? n : 0;',
    '}',
    '',
    'function sortActionPlan(items: any[], mode: ActionPlanSortMode): any[] {',
    '  const arr = Array.isArray(items) ? [...items] : [];',
    '  if (mode === "ORIGINAL") return arr;',
    '  if (mode === "TITLE_ASC") return arr.sort((a,b) => getActionPlanTitle(a).localeCompare(getActionPlanTitle(b)));',
    '  if (mode === "SCORE_DESC") return arr.sort((a,b) => getActionPlanScore(b) - getActionPlanScore(a));',
    '',
    '  // DEFAULT_P0: priority asc then score desc then title',
    '  return arr.sort((a,b) => {',
    '    const pa = normalizePriority(getActionPlanPriorityRaw(a));',
    '    const pb = normalizePriority(getActionPlanPriorityRaw(b));',
    '    if (pa !== pb) return pa - pb;',
    '    const sa = getActionPlanScore(a);',
    '    const sb = getActionPlanScore(b);',
    '    if (sa !== sb) return sb - sa;',
    '    return getActionPlanTitle(a).localeCompare(getActionPlanTitle(b));',
    '  });',
    '}'
  ) -join "`r`n"

  $imports = [regex]::Match($src, "(?s)^(?:import[^\r\n]*\r?\n)+")
  if (-not $imports.Success) { throw "Could not find import block to insert helpers." }

  $src = $src.Insert($imports.Length, "`r`n$helpers`r`n`r`n")
}

# 2) Insert state + persistence inside QuoteCalc component (idempotent)
if ($src -notmatch "actionPlanSortMode") {

  $stateBlock = @(
    '  const [actionPlanSortMode, setActionPlanSortMode] = useState<ActionPlanSortMode>(() => {',
    '    try {',
    '      const saved = localStorage.getItem(ACTIONPLAN_SORT_KEY) as ActionPlanSortMode | null;',
    '      return saved ?? "DEFAULT_P0";',
    '    } catch {',
    '      return "DEFAULT_P0";',
    '    }',
    '  });',
    '',
    '  useEffect(() => {',
    '    try { localStorage.setItem(ACTIONPLAN_SORT_KEY, actionPlanSortMode); } catch {}',
    '  }, [actionPlanSortMode]);',
    ''
  ) -join "`r`n"

  $m = [regex]::Match($src, "function\s+QuoteCalc\s*\([^)]*\)\s*\{\s*\r?\n")
  if (-not $m.Success) {
    $m = [regex]::Match($src, "const\s+QuoteCalc\s*=\s*\([^)]*\)\s*=>\s*\{\s*\r?\n")
  }
  if (-not $m.Success) { throw "Could not find QuoteCalc component declaration." }

  $pos = $m.Index + $m.Length
  $src = $src.Insert($pos, $stateBlock)
}

# 3) Create memo: sortedActionPlan (idempotent)
if ($src -notmatch "const\s+sortedActionPlan\s*=\s*useMemo") {

  $memoBlock = @(
    '  const sortedActionPlan = useMemo(() => {',
    '    let items: any[] = [];',
    '    try {',
    '      // buildActionPlan is a UI helper in this file (engine untouched).',
    '      // @ts-ignore',
    '      items = typeof buildActionPlan === "function" ? buildActionPlan(result) : [];',
    '    } catch {',
    '      items = [];',
    '    }',
    '    return sortActionPlan(items, actionPlanSortMode);',
    '  }, [result, actionPlanSortMode]);',
    ''
  ) -join "`r`n"

  # Anchor after sort mode useEffect block
  $anchor = [regex]::Match($src, "useEffect\(\s*\(\)\s*=>\s*\{\s*try\s*\{\s*localStorage\.setItem\(ACTIONPLAN_SORT_KEY,\s*actionPlanSortMode\);\s*\}\s*catch\s*\{\s*\}\s*\}\s*,\s*\[actionPlanSortMode\]\s*\);\s*\r?\n", "Singleline")
  if ($anchor.Success) {
    $src = $src.Insert($anchor.Index + $anchor.Length, $memoBlock)
  } else {
    # fallback: insert after actionPlanSortMode state line
    $anchor2 = [regex]::Match($src, "const\s*\[\s*actionPlanSortMode\s*,\s*setActionPlanSortMode\s*\][^;]*;\s*\r?\n", "Singleline")
    if (-not $anchor2.Success) { throw "Could not find a stable anchor for sortedActionPlan insertion." }
    $src = $src.Insert($anchor2.Index + $anchor2.Length, "`r`n" + $memoBlock)
  }
}

# 4) Replace actionPlan.map with sortedActionPlan.map (safe, idempotent)
if ($src -match "\{actionPlan\.map\(" -and $src -notmatch "\{sortedActionPlan\.map\(") {
  $src = $src -replace "\{actionPlan\.map\(", "{sortedActionPlan.map("
}

# 5) Add dropdown under Action Plan heading if present (idempotent)
if ($src -notmatch 'aria-label="Action Plan sort"') {

  $heading = [regex]::Match($src, "<h3[^>]*>\s*Action Plan[^<]*</h3>\s*\r?\n", "Singleline")
  if ($heading.Success) {

    $ctrlLines = @(
      '          {/* Action Plan sort */}',
      '          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 10 }}>',
      '            <div style={{ fontSize: 12, opacity: 0.8 }}>Sort</div>',
      '            <select',
      '              value={actionPlanSortMode}',
      '              onChange={(e) => setActionPlanSortMode(e.target.value as ActionPlanSortMode)}',
      '              style={{ padding: "6px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}',
      '              aria-label="Action Plan sort"',
      '            >',
      '              <option value="DEFAULT_P0">Default (P0 first)</option>',
      '              <option value="SCORE_DESC">Score (high → low)</option>',
      '              <option value="TITLE_ASC">Title (A → Z)</option>',
      '              <option value="ORIGINAL">Original</option>',
      '            </select>',
      '          </div>',
      ''
    ) -join "`r`n"

    $src = $src.Insert($heading.Index + $heading.Length, $ctrlLines)
  }
}

# Final checks
if ($src -notmatch "type\s+ActionPlanSortMode") { throw "Patch failed: ActionPlanSortMode missing." }
if ($src -notmatch "sortedActionPlan") { throw "Patch failed: sortedActionPlan missing." }

Set-Content -Path $path -Value $src -Encoding UTF8

"Patched OK: $path"
"Backup: $bak"