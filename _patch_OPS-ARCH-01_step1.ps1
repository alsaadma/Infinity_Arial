# =========================================================
# OPS-ARCH-01 Step 1 — Add /command route + snapshot store
# - Adds: /command (read-only), /quote-builder (QuoteCalc), placeholders
# - Adds minimal shared snapshot store (strict TS safe)
# =========================================================
$ErrorActionPreference = "Stop"

$root = "C:\Users\Mohammed\Documents\INFINITY\2024\IICE\Drones_Study\Drones Calc"

function Backup-File($p) {
  if (Test-Path $p) {
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item $p ($p + ".bak_opsarch01_" + $ts) -Force
  }
}

function Ensure-Dir($p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

function Write-FileUtf8NoBom($path, $content) {
  Ensure-Dir (Split-Path -Parent $path)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Patch-FileRegex($path, $pattern, $replacement, [switch]$Multiple) {
  if (-not (Test-Path $path)) { throw "File not found: $path" }
  Backup-File $path
  $src = Get-Content $path -Raw
  if ($Multiple) {
    $dst = [regex]::Replace($src, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  } else {
    $re = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if (-not $re.IsMatch($src)) { throw "Pattern not found in $path`nPattern: $pattern" }
    $dst = $re.Replace($src, $replacement, 1)
  }
  if ($dst -eq $src) { throw "Patch produced no changes for $path" }
  Write-FileUtf8NoBom $path $dst
}

# ---------------------------------------------------------
# 1) Add snapshot store: src/state/engineSnapshot.ts
# ---------------------------------------------------------
$engineSnapshotPath = Join-Path $root "src\state\engineSnapshot.ts"
Write-FileUtf8NoBom $engineSnapshotPath @'
import { useSyncExternalStore } from "react";

/**
 * Minimal shared "last computed result" snapshot.
 * - In-memory only (per browser session)
 * - Keeps TS strict: safe nulls + typed shape
 */

export type Readiness = "READY" | "NOT_READY" | "UNKNOWN";

export type GapRanked = {
  id?: string;
  title?: string;
  domain?: string;
  severity?: number;
  risk?: number;
  owner_suggestion?: string;
  evidence?: string;
};

export type QuoteResult = {
  readiness?: Readiness | string;
  msq_sar?: number;
  gaps_ranked?: GapRanked[];
  // Fleet info can be added later when the engine returns it consistently
  fleet?: {
    fleet_size?: number;
    capex_sar?: number;
    useful_life_years?: number;
    expected_shows_per_year?: number;
    residual_value_pct?: number;
  };
};

export type EngineSnapshot = {
  computedAtISO: string;
  result: QuoteResult;
};

type Listener = () => void;

let _snapshot: EngineSnapshot | null = null;
const _listeners = new Set<Listener>();

export function setEngineSnapshot(next: EngineSnapshot) {
  _snapshot = next;
  for (const l of _listeners) l();
}

export function getEngineSnapshot(): EngineSnapshot | null {
  return _snapshot;
}

function subscribe(listener: Listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function useEngineSnapshot(): EngineSnapshot | null {
  return useSyncExternalStore(subscribe, getEngineSnapshot, getEngineSnapshot);
}
'@

# ---------------------------------------------------------
# 2) Add Command page: src/pages/Command.tsx
# ---------------------------------------------------------
$commandPath = Join-Path $root "src\pages\Command.tsx"
Write-FileUtf8NoBom $commandPath @'
import { Link } from "react-router-dom";
import { useEngineSnapshot } from "../state/engineSnapshot";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeReliabilityIndex(readiness: string | undefined, gapsCount: number) {
  const r = (readiness || "UNKNOWN").toUpperCase();
  const base = r === "READY" ? 90 : r === "NOT_READY" ? 55 : 65;
  const penalty = gapsCount * 4;
  return clamp(Math.round(base - penalty), 0, 100);
}

export default function Command() {
  const snap = useEngineSnapshot();
  const result = snap?.result;
  const gapsCount = result?.gaps_ranked?.length ?? 0;
  const readiness = (result?.readiness as string | undefined) ?? "UNKNOWN";
  const reliabilityIndex = computeReliabilityIndex(readiness, gapsCount);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Command</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Read-only operational view (no JSON input)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/quote-builder">Quote Builder</Link>
          <span style={{ opacity: 0.4 }}>|</span>
          <Link to="/fleet">Fleet</Link>
          <Link to="/calendar">Calendar</Link>
          <Link to="/reports">Reports</Link>
        </div>
      </div>

      {!result ? (
        <div style={{ marginTop: 18, padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
          <div style={{ fontWeight: 600 }}>No computed state yet</div>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Go to <Link to="/quote-builder">Quote Builder</Link>, run Compute, then return here.
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>Fleet Summary (mock)</div>
              <div style={{ marginTop: 10, lineHeight: 1.7, opacity: 0.9 }}>
                <div>Fleet size: {result.fleet?.fleet_size ?? "—"}</div>
                <div>Expected shows/year: {result.fleet?.expected_shows_per_year ?? "—"}</div>
                <div>CAPEX (SAR): {result.fleet?.capex_sar ?? "—"}</div>
              </div>
              <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                (Will be replaced by real engine fleet outputs)
              </div>
            </div>

            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>Reliability Index</div>
              <div style={{ marginTop: 10, fontSize: 34, fontWeight: 800 }}>
                {reliabilityIndex}
                <span style={{ fontSize: 14, opacity: 0.7, marginLeft: 8 }}>/ 100</span>
              </div>
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                Readiness: <b>{readiness}</b> · Gaps: <b>{gapsCount}</b>
              </div>
            </div>

            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>Permits (placeholder)</div>
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                GACA / city permits panel placeholder
              </div>
            </div>

            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>Calendar (placeholder)</div>
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                Ops calendar placeholder (shows + mobilization)
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Action Plan (basic list)</div>

            {gapsCount === 0 ? (
              <div style={{ opacity: 0.8 }}>No gaps in the last computed result.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.9 }}>
                      <th style={{ padding: "8px 6px" }}>#</th>
                      <th style={{ padding: "8px 6px" }}>Gap</th>
                      <th style={{ padding: "8px 6px" }}>Domain</th>
                      <th style={{ padding: "8px 6px" }}>Owner (suggested)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.gaps_ranked ?? []).slice(0, 20).map((g, idx) => (
                      <tr key={(g.id ?? "gap") + "_" + idx} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <td style={{ padding: "8px 6px", opacity: 0.85 }}>{idx + 1}</td>
                        <td style={{ padding: "8px 6px" }}>{g.title ?? "—"}</td>
                        <td style={{ padding: "8px 6px", opacity: 0.85 }}>{g.domain ?? "—"}</td>
                        <td style={{ padding: "8px 6px", opacity: 0.85 }}>{g.owner_suggestion ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 8, opacity: 0.65, fontSize: 12 }}>
                  Note: Risk dominance grouping will be wired in Step 2+ by reusing your existing ActionPlanTable styling.
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
            Last computed: {snap?.computedAtISO ?? "—"}
          </div>
        </>
      )}
    </div>
  );
}
'@

# ---------------------------------------------------------
# 3) Add placeholder page: src/pages/Placeholder.tsx
# ---------------------------------------------------------
$placeholderPath = Join-Path $root "src\pages\Placeholder.tsx"
Write-FileUtf8NoBom $placeholderPath @'
type Props = {
  title: string;
  note?: string;
};

export default function Placeholder(props: Props) {
  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>{props.title}</h1>
      <div style={{ marginTop: 10, opacity: 0.8 }}>
        {props.note ?? "Placeholder route. Will be implemented in later OPS-ARCH steps."}
      </div>
    </div>
  );
}
'@

# ---------------------------------------------------------
# 4) Patch src/App.tsx to add routes:
#    /command, /quote-builder, placeholders, and keep /quote-calc working
# ---------------------------------------------------------
$appPath = Join-Path $root "src\App.tsx"

# Add imports if not present
if (-not (Test-Path $appPath)) { throw "File not found: $appPath" }
Backup-File $appPath
$appSrc = Get-Content $appPath -Raw

if ($appSrc -notmatch 'from\s+"react-router-dom";') {
  throw "Expected react-router-dom import in src/App.tsx, but couldn't find it."
}

# Ensure Navigate is imported (safe patch)
if ($appSrc -match 'import\s*\{\s*([^}]+)\s*\}\s*from\s*"react-router-dom";') {
  if ($Matches[1] -notmatch '\bNavigate\b') {
    $appSrc = [regex]::Replace(
      $appSrc,
      'import\s*\{\s*([^}]+)\s*\}\s*from\s*"react-router-dom";',
      { param($m) "import { " + ($m.Groups[1].Value.Trim() + ", Navigate") + ' } from "react-router-dom";' },
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }
} else {
  throw "Could not patch react-router-dom import block in src/App.tsx."
}

# Add new component imports if missing
if ($appSrc -notmatch 'from\s+"\./pages/Command";') {
  $appSrc = $appSrc -replace '(import\s+QuoteCalc\s+from\s+"\./pages/QuoteCalc";\s*)', "`$1import Command from `"./pages/Command`";`r`nimport Placeholder from `"./pages/Placeholder`";`r`n"
}

# Patch Routes block: add /command, /quote-builder, placeholders, redirect legacy /quote-calc
# This assumes there's a <Routes> ... </Routes> with at least the existing quote route.
if ($appSrc -notmatch '<Routes>') { throw "Expected <Routes> block in src/App.tsx" }

# Add a small route set near the existing QuoteCalc route
# We will replace any existing /quote-calc element route with a redirect to /quote-builder AND add /quote-calc as alias.
$appSrc = [regex]::Replace(
  $appSrc,
  '<Route\s+path="/quote-calc"\s+element=\{<QuoteCalc\s*/>\}\s*/>',
  '<Route path="/quote-builder" element={<QuoteCalc />} />' + "`r`n" +
  '        <Route path="/quote-calc" element={<Navigate to="/quote-builder" replace />} />',
  1,
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

# If it didn't exist, ensure /quote-builder exists by injecting after <Routes>
if ($appSrc -notmatch 'path="/quote-builder"') {
  $appSrc = [regex]::Replace(
    $appSrc,
    '<Routes>\s*',
    '<Routes>' + "`r`n" +
    '        <Route path="/quote-builder" element={<QuoteCalc />} />' + "`r`n" +
    '        <Route path="/quote-calc" element={<Navigate to="/quote-builder" replace />} />' + "`r`n",
    1,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

# Inject /command + placeholders if missing
if ($appSrc -notmatch 'path="/command"') {
  $appSrc = [regex]::Replace(
    $appSrc,
    '<Routes>\s*',
    '<Routes>' + "`r`n" +
    '        <Route path="/command" element={<Command />} />' + "`r`n",
    1,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

foreach ($r in @(
  @{ path="/fleet"; title="Fleet"; note="Fleet placeholder route (OPS-ARCH later)." },
  @{ path="/calendar"; title="Calendar"; note="Calendar placeholder route (OPS-ARCH later)." },
  @{ path="/reports"; title="Reports"; note="Reports placeholder route (OPS-ARCH later)." }
)) {
  if ($appSrc -notmatch [regex]::Escape($r.path)) {
    $appSrc = [regex]::Replace(
      $appSrc,
      '<Routes>\s*',
      '<Routes>' + "`r`n" +
      ('        <Route path="' + $r.path + '" element={<Placeholder title="' + $r.title + '" note="' + $r.note + '" />} />') + "`r`n",
      1,
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }
}

Write-FileUtf8NoBom $appPath $appSrc

# ---------------------------------------------------------
# 5) Patch QuoteCalc to publish snapshot after Compute
#    We will:
#    - add import: setEngineSnapshot
#    - after result is computed and set in state, also setEngineSnapshot(...)
# ---------------------------------------------------------
$quoteCalcPath = Join-Path $root "src\pages\QuoteCalc.tsx"
if (Test-Path $quoteCalcPath) {
  $qc = Get-Content $quoteCalcPath -Raw
  Backup-File $quoteCalcPath

  if ($qc -notmatch 'setEngineSnapshot') {
    # Add import near other imports
    $qc = [regex]::Replace(
      $qc,
      '(import\s+.+?;\s*)+',
      { param($m)
        $block = $m.Value
        if ($block -notmatch 'from\s+"\.\./state/engineSnapshot"') {
          $block + 'import { setEngineSnapshot } from "../state/engineSnapshot";' + "`r`n"
        } else { $block }
      },
      1,
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }

  # Try to hook into a very common pattern: after computeQuote(...) returns `out` and you call setResult(out)
  # We patch the FIRST occurrence of: setResult(<something>);
  # and append a snapshot write right after it.
  $qc = [regex]::Replace(
    $qc,
    '(setResult\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*;\s*)',
    '$1' + 'setEngineSnapshot({ computedAtISO: new Date().toISOString(), result: $2 as any });' + "`r`n",
    1,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  Write-FileUtf8NoBom $quoteCalcPath $qc
} else {
  Write-Host "NOTE: QuoteCalc.tsx not found at $quoteCalcPath — skipping snapshot publish patch."
}

Write-Host ""
Write-Host "OPS-ARCH-01 Step 1 applied."
Write-Host "Next: run build + open /command after computing in /quote-builder."
'@

Write-Host "Created/updated:"
Write-Host " - $engineSnapshotPath"
Write-Host " - $commandPath"
Write-Host " - $placeholderPath"
Write-Host " - $appPath"
Write-Host " - $quoteCalcPath (if present)"
Write-Host ""
Write-Host "Now run:"
Write-Host "  cd `"$root`""
Write-Host "  npm run build"
Write-Host "  npm run dev"
Write-Host "Then:"
Write-Host "  http://localhost:5173/quote-builder  (Compute)"
Write-Host "  http://localhost:5173/command       (Read-only view)"
