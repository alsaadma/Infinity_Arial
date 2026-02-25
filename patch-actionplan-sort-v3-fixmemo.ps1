# patch-actionplan-sort-v3-fixmemo.ps1
# Fixes corrupted memo dependency line created by previous patch.
# UI-only. Targets src/pages/QuoteCalc.tsx.

$ErrorActionPreference = "Stop"

$p = "src/pages/QuoteCalc.tsx"
if (!(Test-Path $p)) { throw "Missing: $p" }

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $p ($p + ".bak_uipolish_sortV3_fixmemo_" + $ts) -Force

$s = Get-Content $p -Raw

# 1) Replace the entire sortedActionPlanRows useMemo block with a clean version.
$rx = [regex]'const\s+sortedActionPlanRows\s*=\s*useMemo\(\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[^\]]*\]\s*\);\s*'
$m = $rx.Match($s)
if (-not $m.Success) { throw "Could not find sortedActionPlanRows useMemo block." }

$clean = @"
const sortedActionPlanRows = useMemo(() => {
    // rows are produced from the computed result (UI-only transformation)
    return sortActionPlanRows(actionPlanRows ?? [], actionPlanSortMode);
  }, [actionPlanRows, actionPlanSortMode]);
"@

# Keep indentation consistent with the original block indentation
# Detect indentation from the matched block's first line
$firstLine = ($m.Value -split "(`r`n|`n)")[0]
$indent = ""
if ($firstLine -match "^(\s*)const\s+sortedActionPlanRows") { $indent = $Matches[1] }

$cleanIndented = ($clean -split "`r?`n") | ForEach-Object {
  if ($_ -eq "") { "" } else { $indent + $_ }
} | Out-String
$cleanIndented = $cleanIndented.TrimEnd() + "`r`n"

$s = $s.Remove($m.Index, $m.Length).Insert($m.Index, $cleanIndented)

# 2) Remove any accidental trailing junk like "actionPlanRows]);" that might still exist
$s = $s -replace ";\s*actionPlanRows\]\);\s*", ");`r`n"

Set-Content -Path $p -Value $s -Encoding UTF8
"Fixed sortedActionPlanRows memo OK: $p"