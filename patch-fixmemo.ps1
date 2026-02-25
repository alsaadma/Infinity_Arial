$ErrorActionPreference = "Stop"

$p = "src/pages/QuoteCalc.tsx"
if (!(Test-Path $p)) { throw "Missing: $p" }

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $p ($p + ".bak_fixmemo_" + $ts) -Force

$s = Get-Content $p -Raw

# Replace the whole sortedActionPlanRows memo block with a clean one
$rx = [regex]'const\s+sortedActionPlanRows\s*=\s*useMemo\(\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[^\]]*\]\s*\);\s*'
$m = $rx.Match($s)
if (-not $m.Success) { throw "Could not find sortedActionPlanRows useMemo block." }

$firstLine = ($m.Value -split "(`r`n|`n)")[0]
$indent = ""
if ($firstLine -match "^(\s*)const\s+sortedActionPlanRows") { $indent = $Matches[1] }

$cleanLines = @(
  "const sortedActionPlanRows = useMemo(() => {",
  "  return sortActionPlanRows(actionPlanRows ?? [], actionPlanSortMode);",
  "}, [actionPlanRows, actionPlanSortMode]);",
  ""
)

$clean = ($cleanLines | ForEach-Object { if($_ -eq ""){""} else { $indent + $_ } }) -join "`r`n"
$clean += "`r`n"

$s = $s.Remove($m.Index, $m.Length).Insert($m.Index, $clean)

# Remove any stray junk fragment from earlier patch attempts
$s = $s -replace "const actionPlanRows = [^\r\n]*?;\s*actionPlanRows\]\);\s*", ""

Set-Content -Path $p -Value $s -Encoding UTF8
"Fixed memo: $p"