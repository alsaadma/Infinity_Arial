$ErrorActionPreference = "Stop"

$p = "src/pages/QuoteCalc.tsx"
if (!(Test-Path $p)) { throw "Missing: $p" }

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $p ($p + ".bak_uipolish_sort2D_useSorted_" + $ts) -Force

$s = Get-Content $p -Raw

if ($s -match "\{sortedActionPlan\.map\(") {
  "No-op: already using sortedActionPlan.map"
  exit 0
}

if ($s -notmatch "\.map\(") {
  throw "No .map( found at all in QuoteCalc.tsx — unexpected."
}

# IMPORTANT: this script assumes the list is rendered as {actionPlan.map(...)}.
# If your file uses a different variable name, we will update this after inspecting rg output.
if ($s -notmatch "\{actionPlan\.map\(") {
  throw "Could not find {actionPlan.map( to replace. We'll adapt after we inspect the real render code."
}

$s = $s -replace "\{actionPlan\.map\(", "{sortedActionPlan.map("
Set-Content -Path $p -Value $s -Encoding UTF8

"Rewired Action Plan list to use sortedActionPlan.map"