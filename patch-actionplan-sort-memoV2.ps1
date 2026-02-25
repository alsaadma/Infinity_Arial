# patch-actionplan-sort-memoV2.ps1
# UI-only: inserts sortedActionPlan useMemo with a robust anchor.
# Safe to run even if prior patch partially applied.

$ErrorActionPreference = "Stop"

$path = Join-Path (Resolve-Path ".").Path "src\pages\QuoteCalc.tsx"
if (-not (Test-Path $path)) { throw "File not found: $path" }

$ts  = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$path.bak_uipolish_sort2D_memoV2_$ts"
Copy-Item $path $bak -Force

$src = Get-Content $path -Raw
if ($src.Length -lt 800) { throw "Refusing to patch: file too small ($($src.Length) chars)" }

# No-op if already present
if ($src -match "const\s+sortedActionPlan\s*=\s*useMemo") {
  "No-op: sortedActionPlan already exists."
  "Backup: $bak"
  exit 0
}

# Ensure useMemo import exists (best-effort)
if ($src -notmatch "\buseMemo\b") {
  $rx = [regex]'import\s+React\s*,\s*\{\s*([^}]*)\s*\}\s*from\s*["'']react["''];'
  $m = $rx.Match($src)
  if ($m.Success) {
    $inner = $m.Groups[1].Value.Trim()
    if ($inner -notmatch "(^|,)\s*useMemo(\s*,|$)") {
      $newInner = if ($inner) { "$inner, useMemo" } else { "useMemo" }
      $src = $rx.Replace($src, "import React, { $newInner } from `"react`";", 1)
    }
  } else {
    $rx2 = [regex]'import\s*\{\s*([^}]*)\s*\}\s*from\s*["'']react["''];'
    $m2 = $rx2.Match($src)
    if ($m2.Success) {
      $inner2 = $m2.Groups[1].Value.Trim()
      if ($inner2 -notmatch "(^|,)\s*useMemo(\s*,|$)") {
        $newInner2 = if ($inner2) { "$inner2, useMemo" } else { "useMemo" }
        $src = $rx2.Replace($src, "import { $newInner2 } from `"react`";", 1)
      }
    }
  }
}

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

# Robust anchor #1: useEffect that persists sort mode (any formatting)
$rxAnchor = [regex]'useEffect\([\s\S]*?ACTIONPLAN_SORT_KEY[\s\S]*?actionPlanSortMode[\s\S]*?\);\s*\r?\n'
$ma = $rxAnchor.Match($src)

if ($ma.Success) {
  $insertPos = $ma.Index + $ma.Length
  $src = $src.Insert($insertPos, $memoBlock)
} else {
  # Robust anchor #2: after the actionPlanSortMode state declaration
  $rxState = [regex]'const\s*\[\s*actionPlanSortMode\s*,\s*setActionPlanSortMode\s*\]\s*=\s*useState[\s\S]*?\);\s*\r?\n'
  $ms = $rxState.Match($src)
  if (-not $ms.Success) {
    throw "Could not find robust anchors for memo insertion. Ensure actionPlanSortMode + ACTIONPLAN_SORT_KEY exist first."
  }
  $insertPos = $ms.Index + $ms.Length
  $src = $src.Insert($insertPos, "`r`n" + $memoBlock)
}

Set-Content -Path $path -Value $src -Encoding UTF8
"Inserted sortedActionPlan memo OK."
"Backup: $bak"