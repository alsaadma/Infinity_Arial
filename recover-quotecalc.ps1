$ErrorActionPreference = "Stop"

Write-Host "== Drones Calc: QuoteCalc recovery =="

# 1) Try restore from git (preferred)
if (Get-Command git -ErrorAction SilentlyContinue) {
  try {
    git restore -- "src/pages/QuoteCalc.tsx" | Out-Null
    Write-Host "Restored from git (git restore)."
    exit 0
  } catch {
    try {
      git checkout -- "src/pages/QuoteCalc.tsx" | Out-Null
      Write-Host "Restored from git (git checkout)."
      exit 0
    } catch {
      Write-Host "Git restore/checkout failed. Will try backups..."
    }
  }
} else {
  Write-Host "git not found on PATH. Will try backups..."
}

# 2) Try restore from backup files in src/pages
$pages = "src/pages"
if (-not (Test-Path $pages)) { throw "Missing folder: $pages" }

$bak = Get-ChildItem -Path $pages -File |
  Where-Object { $_.Name -like "QuoteCalc.tsx.bak_*" -or $_.Name -like "QuoteCalc.tsx.bak_actionplan_sort_*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $bak) {
  Write-Host "No backups found in src/pages matching QuoteCalc.tsx.bak_*"
  Write-Host "Next: we will locate any QuoteCalc*.bak* anywhere under src if needed."
  $bak = Get-ChildItem -Path "src" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "QuoteCalc.tsx.bak_*" -or $_.Name -like "QuoteCalc.tsx.bak_actionplan_sort_*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

if (-not $bak) { throw "No QuoteCalc backup found under src/." }

Copy-Item -Path $bak.FullName -Destination "src/pages/QuoteCalc.tsx" -Force
Write-Host ("Restored from backup: " + $bak.FullName)