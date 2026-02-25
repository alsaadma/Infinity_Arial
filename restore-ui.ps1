$ErrorActionPreference = "Stop"

Write-Host "== Restore styled UI backups =="

# --- Restore QuoteCalc.tsx from the best recent UI-polish backup ---
$qc = "src/pages/QuoteCalc.tsx"

$best = Get-ChildItem -Path "src/pages" -File |
  Where-Object { $_.Name -like "QuoteCalc.tsx.bak_uipolish_riskA_*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $best) {
  # fallback: newest any uipolish backup
  $best = Get-ChildItem -Path "src/pages" -File |
    Where-Object { $_.Name -like "QuoteCalc.tsx.bak_uipolish_*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

if (-not $best) { throw "No QuoteCalc UI-polish backup found under src/pages." }

Copy-Item -Path $best.FullName -Destination $qc -Force
Write-Host ("Restored QuoteCalc: " + $best.Name)

# --- Restore theme.ts if it was modified ---
$theme = "src/theme.ts"

$themeBak = Get-ChildItem -Path "src" -File |
  Where-Object { $_.Name -like "theme.ts.bak_ui_polish_theme_*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($themeBak) {
  Copy-Item -Path $themeBak.FullName -Destination $theme -Force
  Write-Host ("Restored theme.ts: " + $themeBak.Name)
} else {
  Write-Host "No theme.ts UI-polish backup found. Leaving theme.ts as-is."
}

Write-Host "Done."