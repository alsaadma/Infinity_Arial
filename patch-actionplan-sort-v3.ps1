# patch-actionplan-sort-v3.ps1
# UI-only patch for src/pages/QuoteCalc.tsx
# Implements Action Plan sorting: default P0 first + user override + remembered (localStorage).
# Works with ActionPlanTable rows (ActionPlanRow[]). Does not touch engine logic.

$ErrorActionPreference = "Stop"

$path = Join-Path (Resolve-Path ".").Path "src\pages\QuoteCalc.tsx"
if (-not (Test-Path $path)) { throw "File not found: $path" }

$ts  = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$path.bak_uipolish_sortV3_$ts"
Copy-Item $path $bak -Force

$src = Get-Content $path -Raw
if ($src.Length -lt 2000) { throw "Refusing to patch: file too small ($($src.Length) chars)" }

# 0) Ensure MUI MenuItem import exists (for select options)
if ($src -notmatch "\bMenuItem\b") {
  $rxMui = [regex]'import\s*\{\s*([^}]*)\s*\}\s*from\s*["'']@mui/material["''];'
  $mMui = $rxMui.Match($src)
  if ($mMui.Success) {
    $inner = $mMui.Groups[1].Value.Trim()
    if ($inner -notmatch "(^|,)\s*MenuItem(\s*,|$)") {
      $newInner = if ($inner) { "$inner, MenuItem" } else { "MenuItem" }
      $src = $rxMui.Replace($src, "import { $newInner } from `"@mui/material`";", 1)
    }
  } else {
    throw "Could not find MUI import block from @mui/material to add MenuItem."
  }
}

# 1) Insert helpers after imports (idempotent)
if ($src -notmatch "type\s+ActionPlanSortMode\s*=") {

  $helpers = @(
    'type ActionPlanSortMode = "DEFAULT_P0" | "SCORE_DESC" | "TITLE_ASC" | "ORIGINAL";',
    'const ACTIONPLAN_SORT_KEY = "drones_calc.actionPlan.sortMode";',
    '',
    'function apNormalizePriority(v: any): number {',
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
    'function apTitle(r: any): string {',
    '  return String(r?.title ?? r?.gap ?? r?.name ?? r?.label ?? r?.owner ?? "Action Item");',
    '}',
    '',
    'function apPriorityRaw(r: any): any {',
    '  return (r?.priority ?? r?.gapPriority ?? r?.prio ?? r?.severity ?? r?.risk ?? r?.level ?? null);',
    '}',
    '',
    'function apScore(r: any): number {',
    '  const n = Number(r?.score ?? r?.risk_score ?? r?.riskScore ?? r?.impact ?? r?.weight ?? r?.rank_score ?? 0);',
    '  return Number.isFinite(n) ? n : 0;',
    '}',
    '',
    'function sortActionPlanRows(rows: any[], mode: ActionPlanSortMode): any[] {',
    '  const arr = Array.isArray(rows) ? [...rows] : [];',
    '  if (mode === "ORIGINAL") return arr;',
    '  if (mode === "TITLE_ASC") return arr.sort((a,b) => apTitle(a).localeCompare(apTitle(b)));',
    '  if (mode === "SCORE_DESC") return arr.sort((a,b) => apScore(b) - apScore(a));',
    '  // DEFAULT_P0: priority asc then score desc then title',
    '  return arr.sort((a,b) => {',
    '    const pa = apNormalizePriority(apPriorityRaw(a));',
    '    const pb = apNormalizePriority(apPriorityRaw(b));',
    '    if (pa !== pb) return pa - pb;',
    '    const sa = apScore(a);',
    '    const sb = apScore(b);',
    '    if (sa !== sb) return sb - sa;',
    '    return apTitle(a).localeCompare(apTitle(b));',
    '  });',
    '}'
  ) -join "`r`n"

  $imports = [regex]::Match($src, "(?s)^(?:import[^\r\n]*\r?\n)+")
  if (-not $imports.Success) { throw "Could not find import block to insert helpers." }

  $src = $src.Insert($imports.Length, "`r`n$helpers`r`n`r`n")
}

# 2) Insert sort mode state + persistence inside QuoteCalc (idempotent)
if ($src -notmatch "\bactionPlanSortMode\b") {

  $stateBlock = @(
    '  // -------------------------',
    '  // Action Plan sorting (UI)',
    '  // -------------------------',
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

  $m = [regex]::Match($src, "export\s+default\s+function\s+QuoteCalc\s*\(\)\s*\{\s*\r?\n")
  if (-not $m.Success) { throw "Could not find QuoteCalc() function header." }

  $pos = $m.Index + $m.Length
  $src = $src.Insert($pos, $stateBlock)
}

# 3) Create sorted rows memo (idempotent)
if ($src -notmatch "const\s+sortedActionPlanRows\s*=\s*useMemo") {

  # We need to find the rows variable name used for ActionPlanTable props.
  # We'll insert memo near where rows are defined OR just before return.

  $memoBlock = @(
    '  const sortedActionPlanRows = useMemo(() => {',
    '    // rows are produced from the computed result (UI-only transformation)',
    '    // @ts-ignore',
    '    const base = (typeof actionPlanRows !== "undefined" ? actionPlanRows : undefined) as any;',
    '    return sortActionPlanRows(base ?? [], actionPlanSortMode);',
    '  }, [actionPlanSortMode, /* @ts-ignore */ actionPlanRows]);',
    ''
  ) -join "`r`n"

  # This memo references actionPlanRows. We will create/ensure actionPlanRows exists (next step).
  # Insert memo just before "return (" of QuoteCalc.
  $ret = [regex]::Match($src, "\r?\n\s*return\s*\(\s*\r?\n")
  if (-not $ret.Success) { throw "Could not find return( anchor in QuoteCalc." }

  $src = $src.Insert($ret.Index + 1, $memoBlock)
}

# 4) Ensure there is an intermediate variable actionPlanRows and it is used by ActionPlanTable
# We will:
# - locate <ActionPlanTable ... rows={SOMETHING} ... />
# - extract SOMETHING and assign to const actionPlanRows = SOMETHING; (before return)
# - replace rows prop to use sortedActionPlanRows

if ($src -notmatch "<ActionPlanTable") {
  throw "Could not find <ActionPlanTable .../> usage in QuoteCalc.tsx. The UI structure may have changed."
}

# Find the rows prop expression inside the first ActionPlanTable occurrence
$rxTable = [regex]'<ActionPlanTable[\s\S]*?rows\s*=\s*\{([\s\S]*?)\}[\s\S]*?>'
$mt = $rxTable.Match($src)
if (-not $mt.Success) { throw "Could not locate rows={...} prop on <ActionPlanTable ...>." }

$rowsExpr = $mt.Groups[1].Value.Trim()

# If actionPlanRows doesn't exist yet, create it before return
if ($src -notmatch "const\s+actionPlanRows\s*=") {

  $assign = "  const actionPlanRows = $rowsExpr;`r`n`r`n"

  $ret2 = [regex]::Match($src, "\r?\n\s*return\s*\(\s*\r?\n")
  if (-not $ret2.Success) { throw "Could not find return( anchor for actionPlanRows insertion." }

  $src = $src.Insert($ret2.Index + 1, $assign)
}

# Replace rows={...} with rows={sortedActionPlanRows} (idempotent)
if ($src -notmatch "rows\s*=\s*\{sortedActionPlanRows\}") {
  # Replace only within the first ActionPlanTable block
  $tableStart = $mt.Index
  $tableLen   = $mt.Length
  $tableBlock = $src.Substring($tableStart, $tableLen)

  $tableBlock2 = [regex]::Replace($tableBlock, 'rows\s*=\s*\{[\s\S]*?\}', 'rows={sortedActionPlanRows}', 1)
  $src = $src.Remove($tableStart, $tableLen).Insert($tableStart, $tableBlock2)
}

# 5) Add a dropdown control near ActionPlanTable (above it). Idempotent via aria-label.
if ($src -notmatch 'aria-label="Action Plan sort"') {

  $ctrl = @(
    '          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1 }}>',
    '            <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>Action Plan</Typography>',
    '            <TextField',
    '              select',
    '              size="small"',
    '              value={actionPlanSortMode}',
    '              onChange={(e) => setActionPlanSortMode(e.target.value as ActionPlanSortMode)}',
    '              label="Sort"',
    '              aria-label="Action Plan sort"',
    '              sx={{ minWidth: 220 }}',
    '            >',
    '              <MenuItem value="DEFAULT_P0">Default (P0 first)</MenuItem>',
    '              <MenuItem value="SCORE_DESC">Score (high → low)</MenuItem>',
    '              <MenuItem value="TITLE_ASC">Title (A → Z)</MenuItem>',
    '              <MenuItem value="ORIGINAL">Original</MenuItem>',
    '            </TextField>',
    '          </Box>'
  ) -join "`r`n"

  # Insert control immediately before <ActionPlanTable ...>
  $idx = $src.IndexOf("<ActionPlanTable")
  if ($idx -lt 0) { throw "Internal error: ActionPlanTable index not found." }

  # Find start of line for the ActionPlanTable line (so indentation matches)
  $lineStart = $src.LastIndexOf("`n", $idx)
  if ($lineStart -lt 0) { $lineStart = 0 } else { $lineStart = $lineStart + 1 }

  $src = $src.Insert($lineStart, $ctrl + "`r`n")
}

Set-Content -Path $path -Value $src -Encoding UTF8
"Patched OK: $path"
"Backup: $bak"