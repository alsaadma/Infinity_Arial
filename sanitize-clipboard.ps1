$ErrorActionPreference = "Stop"
$clip = Get-Clipboard -Raw

# Remove RTL/LTR directionality marks that break PowerShell parsing
$clip = $clip -replace '[\u200E\u200F\u202A-\u202E]', ''

# Normalize smart quotes to ASCII quotes
$clip = $clip -replace '[\u2018\u2019]', "'"
$clip = $clip -replace '[\u201C\u201D]', '"'

Set-Clipboard -Value $clip
Write-Host "Clipboard sanitized."