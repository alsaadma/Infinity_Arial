# patch-actionplan-sort-v3-hotfix.ps1
# Fixes:
# 1) actionPlanRows must be declared before sortedActionPlanRows memo (TDZ fix)
# 2) ActionPlanTable must use rows={sortedActionPlanRows}

$ErrorActionPreference = "Stop"

$p = "src/pages/QuoteCalc.tsx"
if (!(Test-Path $p)) { throw "Missing: $p" }

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $p ($p + ".bak_uipolish_sortV3_hotfix_" + $ts) -Force

$s = Get-Content $p -Raw

# --- 1) Rewire ActionPlanTable rows prop to sortedActionPlanRows (first occurrence) ---
if ($s -match "rows=\{sortedActionPlanRows\}") {
  "No-op: ActionPlanTable already uses sortedActionPlanRows."
} else {
  $rxTableRows = [regex]'(<ActionPlanTable\b[^>]*\brows\s*=\s*)\{[^}]*\}'
  $m = $rxTableRows.Match($s)
  if (-not $m.Success) { throw "Could not find rows={...} on <ActionPlanTable ...>." }

  $replacement = $m.Groups[1].Value + "{sortedActionPlanRows}"
  $s = $rxTableRows.Replace($s, $replacement, 1)
  "Rewired ActionPlanTable rows -> sortedActionPlanRows"
}

# --- 2) Ensure actionPlanRows is declared before sortedActionPlanRows memo ---
# We expect:
#   const sortedActionPlanRows = useMemo(... actionPlanRows ...)
# and somewhere:
#   const actionPlanRows = simulatedActionRows;
#
# We'll move the actionPlanRows line to immediately above the memo if it's below.

$rxMemo = [regex]'^\s*const\s+sortedActionPlanRows\s*=\s*useMemo\('
$rxRowsLine = [regex]'^\s*const\s+actionPlanRows\s*=\s*.*?;\s*$'

$lines = $s -split "(`r`n|`n)"
$idxMemo = -1
$idxRows = -1

for ($i=0; $i -lt $lines.Count; $i++) {
  if ($idxMemo -lt 0 -and $rxMemo.IsMatch($lines[$i])) { $idxMemo = $i }
  if ($idxRows -lt 0 -and $rxRowsLine.IsMatch($lines[$i])) { $idxRows = $i }
}

if ($idxMemo -lt 0) { throw "Could not find sortedActionPlanRows memo line." }
if ($idxRows -lt 0) { throw "Could not find actionPlanRows declaration line." }

if ($idxRows -gt $idxMemo) {
  $rowLine = $lines[$idxRows]
  # remove original row line
  $lines = @($lines[0..($idxRows-1)] + $lines[($idxRows+1)..($lines.Count-1)])
  # insert above memo (memo index unchanged if removed below it)
  $lines = @($lines[0..($idxMemo-1)] + $rowLine + $lines[$idxMemo..($lines.Count-1)])
  "Moved actionPlanRows above sortedActionPlanRows (TDZ fix)."
} else {
  "No-op: actionPlanRows already above memo."
}

# Rejoin preserving CRLF
$out = ($lines -join "`r`n")
Set-Content -Path $p -Value $out -Encoding UTF8

"Hotfix applied: $p"