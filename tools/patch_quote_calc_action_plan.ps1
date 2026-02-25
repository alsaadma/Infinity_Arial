$ErrorActionPreference = "Stop"

$root = "C:\Users\Mohammed\Documents\INFINITY\2024\IICE\Drones_Study\Drones Calc"
$path = Join-Path $root "src\app\quote-calc\page.tsx"
if (-not (Test-Path $path)) { throw "File not found: $path" }

$ts  = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$path.bak_actionplan_$ts"
Copy-Item $path $bak -Force

$src = Get-Content $path -Raw
if ($src.Length -lt 500) { throw "Refusing to patch: file too small ($($src.Length) chars)" }

# 1) Insert buildActionPlan() above default export if missing
if ($src -notmatch "function\s+buildActionPlan\s*\(") {
  $buildFn = @"
function buildActionPlan(result: any) {
  if (!result?.gaps_ranked?.length) return [];

  return result.gaps_ranked.slice(0, 3).map((g: any, i: number) => ({
    id: `ACT_${i + 1}`,
    title: `Close: ${g.category}`,
    why: g.blocker
      ? "This is a blocker and prevents operational readiness."
      : "This gap materially increases operational risk.",
    impact: g.blocker ? "HIGH" : "MEDIUM",
    steps: [
      g.fix,
      "Recalculate MSQ after adjustment.",
      "Confirm risk level reduced.",
    ],
  }));
}

"@

  $pat = [regex]'(?m)^\s*export\s+default\s+function\s+QuoteCalcPage\s*\('
  if (-not $pat.IsMatch($src)) { throw "Could not find: export default function QuoteCalcPage(" }
  $src = $pat.Replace($src, ($buildFn + "export default function QuoteCalcPage("), 1)
  Write-Host "OK: inserted buildActionPlan()"
} else {
  Write-Host "SKIP: buildActionPlan() already exists"
}

# 2) Insert const actions = buildActionPlan(result);
if ($src -notmatch '(?m)^\s*const\s+actions\s*=\s*buildActionPlan\(\s*result\s*\)\s*;') {
  $patResult = [regex]'(?m)^\s*const\s+result\s*=\s*.*$'
  if ($patResult.IsMatch($src)) {
    $src = $patResult.Replace($src, '$0' + "`r`n" + '  const actions = buildActionPlan(result);', 1)
    Write-Host "OK: inserted actions line after const result = ..."
  } else {
    $patFn = [regex]'(?m)^\s*export\s+default\s+function\s+QuoteCalcPage\s*\(\)\s*\{'
    if (-not $patFn.IsMatch($src)) { throw "Could not find QuoteCalcPage() opening." }
    $src = $patFn.Replace($src, '$0' + "`r`n" + '  const actions = buildActionPlan(result);', 1)
    Write-Host "OK: inserted actions line after function start"
  }
} else {
  Write-Host "SKIP: actions line already exists"
}

# 3) Insert Action Plan JSX before <h3>All Gaps</h3>
$needle = "<h3>All Gaps</h3>"
$i = $src.IndexOf($needle)
if ($i -lt 0) { throw "Could not find '$needle' in file." }

if ($src -notmatch '(?s)\{actions\.length\s*>\s*0\s*&&\s*\(') {
  $jsx = @"
{actions.length > 0 && (
  <div style={{ marginTop: 24 }}>
    <h3>Action Plan</h3>
    <div style={{ marginTop: 8 }}>
      {actions.map((a) => (
        <div
          key={a.id}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 10,
            borderRadius: 6,
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 600 }}>{a.title}</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            {a.why}
          </div>
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {a.steps.map((s: string, idx: number) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
)}

"@
  $src = $src.Substring(0, $i) + $jsx + $src.Substring($i)
  Write-Host "OK: inserted Action Plan JSX"
} else {
  Write-Host "SKIP: Action Plan JSX already exists"
}

if ($src.Length -lt 500) { throw "Refusing to write suspiciously small output ($($src.Length) chars)" }
Set-Content -Path $path -Value $src -Encoding UTF8

Write-Host "DONE: patched $path"
Write-Host "Backup: $bak"
