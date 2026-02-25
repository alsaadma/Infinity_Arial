pwsh -NoProfile -ExecutionPolicy Bypass -Command @'
$ErrorActionPreference = "Stop"

$root = "C:\Users\Mohammed\Documents\INFINITY\2024\IICE\Drones_Study\Drones Calc"
$path = Join-Path $root "src\pages\QuoteCalc.tsx"
if (-not (Test-Path $path)) { throw "File not found: $path" }

# Read
$src = Get-Content -LiteralPath $path -Raw
if (-not $src -or $src.Length -lt 500) { throw "Refusing to patch: file too small / empty." }

# Backup (correct string interpolation)
$ts  = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$path.bak_fix_$ts"
Copy-Item -LiteralPath $path -Destination $bak -Force
Write-Host "OK: backup => $bak"

$changed = New-Object System.Collections.Generic.List[string]

# 0) Safety: ensure we are patching QuoteCalc component file
if ($src -notmatch "export\s+default\s+function\s+QuoteCalc") {
  throw "This does not look like QuoteCalc.tsx (export default function QuoteCalc not found)."
}

# 1) Remove the BAD early-return block inside component
$badReturnPattern = '(?ms)^\s*const\s+s\s*=\s*localStorage\.getItem\("quote_calc_last_result"\)\s*;\s*\r?\n\s*if\s*\(\s*!s\s*\)\s*return\s+null\s*;\s*\r?\n\s*const\s+p\s*=\s*safeParse\(s\)\s*;\s*\r?\n\s*return\s+p\.ok\s*\?\s*p\.value\s*:\s*null\s*;\s*\r?\n'
if ([regex]::IsMatch($src, $badReturnPattern)) {
  $src = [regex]::Replace($src, $badReturnPattern, "", 1)
  $changed.Add("Removed stray early return block (localStorage quote_calc_last_result).") | Out-Null
} else {
  Write-Host "INFO: stray early return block not found (maybe already removed)."
}

# 2) Ensure result state exists (insert after error state)
if ($src -notmatch 'const\s+\[result\s*,\s*setResult\]\s*=\s*useState') {
  $errPattern = '(?m)^\s*const\s+\[error\s*,\s*setError\]\s*=\s*useState<[^>]*>\(\s*""\s*\)\s*;\s*$'
  if ($src -notmatch $errPattern) {
    throw "Could not locate: const [error, setError] = useState<string>(\"\");"
  }

  $resultInsert = @'
  const [result, setResult] = useState<any>(() => {
    const s = localStorage.getItem("quote_calc_last_result");
    if (!s) return null;
    const p = safeParse(s);
    return p.ok ? p.value : null;
  });
'@

  $src = [regex]::Replace($src, $errPattern, '$0' + "`r`n`r`n" + $resultInsert, 1)
  $changed.Add("Inserted result state with localStorage initializer.") | Out-Null
} else {
  Write-Host "INFO: result state already exists."
}

# 3) Ensure readPath helper exists (your JSX uses it)
if ($src -notmatch 'function\s+readPath\s*\(') {
  $patchFnPattern = '(?ms)function\s+patchInputJson\s*\(\s*mut\s*:\s*\(\s*obj\s*:\s*any\s*\)\s*=>\s*void\s*\)\s*\{.*?\r?\n\s*\}\s*'
  if ($src -notmatch $patchFnPattern) {
    throw "Could not locate patchInputJson(...) function to insert readPath."
  }

  $readPath = @'

  function readPath(obj: any, path: string) {
    const parts = path.split(".");
    let cur: any = obj;
    for (const p of parts) cur = cur?.[p];
    return cur;
  }
'@

  $src = [regex]::Replace($src, $patchFnPattern, ('$0' + $readPath + "`r`n"), 1)
  $changed.Add("Added readPath(obj, path) helper.") | Out-Null
} else {
  Write-Host "INFO: readPath already exists."
}

# 4) Fix patchInputJson call sites to match signature: patchInputJson((o)=>{...})
$callPattern = 'patchInputJson\(\s*inputText\s*,\s*setInputText\s*,\s*(\(\s*o\s*\)\s*=>\s*\{)'
if ([regex]::IsMatch($src, $callPattern)) {
  $src = [regex]::Replace($src, $callPattern, 'patchInputJson($1')
  $changed.Add("Fixed patchInputJson(...) call sites to signature patchInputJson((o)=>{...}).") | Out-Null
} else {
  Write-Host "INFO: No patchInputJson(inputText, setInputText, ...) call sites found."
}

# 5) Fix the '));return (' formatting issue safely
$src2 = [regex]::Replace($src, '\)\)\s*;\s*return\s*\(', '));' + "`r`n" + '  return (')
if ($src2 -ne $src) {
  $src = $src2
  $changed.Add("Inserted newline before return (fixed '));return(').") | Out-Null
}

# Write back
Set-Content -LiteralPath $path -Value $src -Encoding UTF8
Write-Host "DONE: patched => $path"

if ($changed.Count -gt 0) {
  Write-Host "`nChanges:"
  $changed | ForEach-Object { Write-Host (" - " + $_) }
} else {
  Write-Host "`nNo changes were necessary (already patched)."
}

'@