param(
  [Parameter(Mandatory=$true)]
  [string] $File
)

$ErrorActionPreference = "Stop"

# Resolve relative paths safely
$resolved = Resolve-Path -Path $File -ErrorAction Stop
$script   = Get-Content -Path $resolved.Path -Raw

$bytes = [Text.Encoding]::Unicode.GetBytes($script)
$enc   = [Convert]::ToBase64String($bytes)

pwsh -NoProfile -ExecutionPolicy Bypass -EncodedCommand $enc