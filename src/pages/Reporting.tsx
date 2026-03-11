// src/pages/Reporting.tsx  — Module 8: Reporting & Analytics
import { useEffect, useState } from 'react'

interface KpiSummary {
  generated_at: string
  fleet:       { total: number; active: number; inactive: number; availability_pct: number }
  battery:     { total: number; avg_cycles: number; at_max_cycles: number }
  shows:       { upcoming_count: number; total_drones_required: number; max_single_show: number; overbooked_months: number }
  readiness:   { open_items: number; overdue_items: number }
  maintenance: { logs_last_30_days: number }
  permits:     { expiring_soon: number; expired: number; approved: number }
  costs:       { configured_rows: number }
}
type Dataset = 'drones' | 'batteries' | 'shows' | 'maintenance' | 'permits' | 'readiness'

/* ── Donut chart (pure SVG, no deps) ── */
interface Slice { value: number; color: string; label: string }
function DonutChart({ slices, size = 96 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0)
  if (!total) return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={size*0.38} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size*0.16} />
    </svg>
  )
  const cx = size / 2, cy = size / 2, R = size * 0.38, inn = size * 0.22
  let ang = -Math.PI / 2
  const paths = slices.filter(s => s.value > 0).map((s, i) => {
    const sw  = (s.value / total) * Math.PI * 2
    const x1  = cx + R   * Math.cos(ang),    y1  = cy + R   * Math.sin(ang)
    const xi2 = cx + inn * Math.cos(ang),    yi2 = cy + inn * Math.sin(ang)
    ang += sw
    const x2  = cx + R   * Math.cos(ang),    y2  = cy + R   * Math.sin(ang)
    const xi1 = cx + inn * Math.cos(ang),    yi1 = cy + inn * Math.sin(ang)
    const lg  = sw > Math.PI ? 1 : 0
    return <path key={i} fill={s.color} opacity={0.88}
      d={"M "+x1+" "+y1+" A "+R+" "+R+" 0 "+lg+" 1 "+x2+" "+y2+" L "+xi1+" "+yi1+" A "+inn+" "+inn+" 0 "+lg+" 0 "+xi2+" "+yi2+" Z"} />
  })
  return <svg width={size} height={size} viewBox={"0 0 "+size+" "+size}>{paths}</svg>
}

function Legend({ slices }: { slices: Slice[] }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {slices.map(s => (
        <div key={s.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:9, height:9, borderRadius:2, background:s.color, flexShrink:0 }} />
          <span style={{ fontSize:10, color:'#8a9bc0', whiteSpace:'nowrap' }}>{s.label}: <b style={{ color:'#c5cfe8' }}>{s.value}</b></span>
        </div>
      ))}
    </div>
  )
}

function ChartRow({ children, slices }: { children: React.ReactNode; slices: Slice[] }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:14, flex:1 }}>{children}</div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <DonutChart slices={slices} size={96} />
        <Legend slices={slices} />
      </div>
    </div>
  )
}

/* ── Helpers ── */
function statusColor(v: number, warn: number, danger: number, invert = false) {
  if (invert) { return v >= danger ? '#ef4444' : v >= warn ? '#f59e0b' : '#22c55e' }
  return v <= danger ? '#ef4444' : v <= warn ? '#f59e0b' : '#22c55e'
}

function KpiCard({ label, value, sub, accent, note }: {
  label: string; value: string | number; sub?: string; accent?: string; note?: string
}) {
  return (
    <div style={{ background:'#1e2535', borderRadius:10, padding:'18px 22px',
      borderLeft:"4px solid "+(accent ?? '#4f87f5'),
      display:'flex', flexDirection:'column', gap:4, minWidth:155 }}>
      <span style={{ fontSize:11, color:'#8a9bc0', textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
      <span style={{ fontSize:30, fontWeight:700, color:'#e8eaf6', lineHeight:1.1 }}>{value}</span>
      {sub  && <span style={{ fontSize:12, color:'#6b7fa3' }}>{sub}</span>}
      {note && <span style={{ fontSize:11, color:accent ?? '#4f87f5', marginTop:4 }}>{note}</span>}
    </div>
  )
}

function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
      borderBottom:'1px solid #2a3550', paddingBottom:8, marginBottom:16, marginTop:32 }}>
      {icon && <span style={{ fontSize:16 }}>{icon}</span>}
      <span style={{ fontWeight:600, fontSize:15, color:'#c5cfe8', letterSpacing:0.4 }}>{title}</span>
    </div>
  )
}

/* ── Export panel ── */
const DATASETS: { key: Dataset; label: string }[] = [
  { key:'drones',      label:'Drone Fleet'     },
  { key:'batteries',   label:'Battery Units'   },
  { key:'shows',       label:'Show Events'     },
  { key:'maintenance', label:'Maintenance Logs'},
  { key:'permits',     label:'Permits'         },
  { key:'readiness',   label:'Readiness Items' },
]
function ExportPanel() {
  const [loading, setLoading] = useState<Dataset | null>(null)
  const handleExport = async (dataset: Dataset) => {
    setLoading(dataset)
    try {
      const res  = await fetch("/api/reporting/export?dataset="+dataset)
      const text = await res.text()
      if (!text.trim()) { alert("No data for: "+dataset); return }
      const blob = new Blob([text], { type:'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = dataset+"_export_"+new Date().toISOString().slice(0,10)+".csv"
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Export failed. Is the server running?') }
    finally  { setLoading(null) }
  }
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
      {DATASETS.map(d => (
        <button key={d.key} onClick={() => handleExport(d.key)} disabled={loading === d.key}
          style={{ padding:'10px 18px', borderRadius:8, border:'1px solid #2e3f5c',
            background: loading===d.key ? '#1a2540' : '#243052',
            color:'#c5cfe8', cursor:'pointer', fontSize:13, fontWeight:500,
            opacity: loading===d.key ? 0.6 : 1 }}>
          {loading===d.key ? 'Exporting...' : 'Export '+d.label}
        </button>
      ))}
    </div>
  )
}

function handlePrint(kpi: KpiSummary) {
  const win = window.open('','_blank'); if (!win) return
  win.document.write('<html><head><title>Drones Calc KPI Report</title>'
    +'<style>body{font-family:Arial,sans-serif;padding:32px;color:#111}'
    +'table{width:100%;border-collapse:collapse;margin-bottom:24px}'
    +'th{background:#1e2535;color:#fff;padding:8px 12px;text-align:left;font-size:13px}'
    +'td{padding:7px 12px;border-bottom:1px solid #ddd;font-size:13px}'
    +'h2{font-size:15px;margin:20px 0 8px;border-bottom:2px solid #4f87f5;padding-bottom:4px}'
    +'</style></head><body>'
    +'<h1>Drones Calc - KPI Summary Report</h1>'
    +'<p>Generated: '+new Date(kpi.generated_at).toLocaleString()+'</p>'
    +'<h2>Fleet</h2><table><tr><th>Metric</th><th>Value</th></tr>'
    +'<tr><td>Total</td><td>'+kpi.fleet.total+'</td></tr>'
    +'<tr><td>Active</td><td>'+kpi.fleet.active+'</td></tr>'
    +'<tr><td>Inactive</td><td>'+kpi.fleet.inactive+'</td></tr>'
    +'<tr><td>Availability</td><td>'+kpi.fleet.availability_pct+'%</td></tr></table>'
    +'<h2>Battery</h2><table><tr><th>Metric</th><th>Value</th></tr>'
    +'<tr><td>Total</td><td>'+kpi.battery.total+'</td></tr>'
    +'<tr><td>Avg Cycles</td><td>'+kpi.battery.avg_cycles+'</td></tr>'
    +'<tr><td>High Cycle</td><td>'+kpi.battery.at_max_cycles+'</td></tr></table>'
    +'<h2>Shows</h2><table><tr><th>Metric</th><th>Value</th></tr>'
    +'<tr><td>Upcoming</td><td>'+kpi.shows.upcoming_count+'</td></tr>'
    +'<tr><td>Total Drones</td><td>'+kpi.shows.total_drones_required+'</td></tr>'
    +'<tr><td>Largest Show</td><td>'+kpi.shows.max_single_show+'</td></tr></table>'
    +'<h2>Permits</h2><table><tr><th>Metric</th><th>Value</th></tr>'
    +'<tr><td>Approved</td><td>'+kpi.permits.approved+'</td></tr>'
    +'<tr><td>Expiring Soon</td><td>'+kpi.permits.expiring_soon+'</td></tr>'
    +'<tr><td>Expired</td><td>'+kpi.permits.expired+'</td></tr></table>'
    +'</body></html>')
  win.document.close(); win.print()
}

/* ── Main page ── */
export default function Reporting() {
  const [kpi,     setKpi]     = useState<KpiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/reporting/kpi-summary')
      .then(r => r.json())
      .then(d => { setKpi(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color:'#8a9bc0', padding:40, textAlign:'center' }}>Loading KPI data...</div>
  if (error || !kpi) return <div style={{ color:'#ef4444', padding:40 }}>{error ?? 'No data returned'}</div>

  const fleetSlices: Slice[] = [
    { value: kpi.fleet.active,   color:'#22c55e', label:'Active'   },
    { value: kpi.fleet.inactive, color:'#ef4444', label:'Inactive' },
  ]
  const batterySlices: Slice[] = [
    { value: kpi.battery.total - kpi.battery.at_max_cycles, color:'#4f87f5', label:'Normal'    },
    { value: kpi.battery.at_max_cycles,                     color:'#ef4444', label:'High Cycle' },
  ]
  const showSlices: Slice[] = [
    { value: kpi.fleet.active,                  color:'#22c55e', label:'Fleet Available' },
    { value: kpi.shows.total_drones_required,   color:'#a78bfa', label:'Drones Required' },
  ]
  const permitSlices: Slice[] = [
    { value: kpi.permits.approved,      color:'#22c55e', label:'Approved'      },
    { value: kpi.permits.expiring_soon, color:'#f59e0b', label:'Expiring Soon'  },
    { value: kpi.permits.expired,       color:'#ef4444', label:'Expired'       },
  ]

  return (
    <div style={{ padding:'28px 32px', maxWidth:1150, margin:'0 auto' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, color:'#e8eaf6', fontWeight:700 }}>Reporting & Analytics</h1>
          <p style={{ margin:'4px 0 0', fontSize:12, color:'#6b7fa3' }}>
            Cross-module KPI snapshot &middot; Generated {new Date(kpi.generated_at).toLocaleString()}
          </p>
        </div>
        <button onClick={() => handlePrint(kpi)} style={{ padding:'10px 20px', borderRadius:8,
          border:'1px solid #4f87f5', background:'transparent', color:'#4f87f5',
          cursor:'pointer', fontSize:13, fontWeight:600 }}>
          Print Report
        </button>
      </div>

      <SectionHeader title="Data Export (CSV)" />
      <p style={{ color:'#6b7fa3', fontSize:13, marginBottom:14 }}>
        Download raw table data for offline analysis, audit, or reporting.
      </p>
      <ExportPanel />

      <SectionHeader title="Fleet Overview" />
      <ChartRow slices={fleetSlices}>
        <KpiCard label="Total Drones" value={kpi.fleet.total} accent="#4f87f5" />
        <KpiCard label="Active"       value={kpi.fleet.active}
          accent={statusColor(kpi.fleet.active, 14, 10)}
          note={kpi.fleet.availability_pct+"% availability"} />
        <KpiCard label="Inactive"     value={kpi.fleet.inactive}
          accent={kpi.fleet.inactive > 4 ? '#ef4444' : '#f59e0b'} />
        <KpiCard label="Availability" value={kpi.fleet.availability_pct+"%"}
          accent={statusColor(kpi.fleet.availability_pct, 80, 60)} />
      </ChartRow>

      <SectionHeader title="Battery Health" />
      <ChartRow slices={batterySlices}>
        <KpiCard label="Total Batteries"   value={kpi.battery.total}      accent="#4f87f5" />
        <KpiCard label="Avg Cycle Count"   value={kpi.battery.avg_cycles}
          accent={statusColor(kpi.battery.avg_cycles, 250, 300, true)}
          note="Threshold: 300 cycles" />
        <KpiCard label="High Cycle (>300)" value={kpi.battery.at_max_cycles}
          accent={kpi.battery.at_max_cycles > 0 ? '#ef4444' : '#22c55e'}
          note={kpi.battery.at_max_cycles > 0 ? 'Review for replacement' : 'All within limit'} />
      </ChartRow>

      <SectionHeader title="Show Demand" />
      <ChartRow slices={showSlices}>
        <KpiCard label="Upcoming Shows"      value={kpi.shows.upcoming_count}          accent="#4f87f5" />
        <KpiCard label="Total Drones Needed" value={kpi.shows.total_drones_required}  accent="#a78bfa" />
        <KpiCard label="Largest Show"        value={kpi.shows.max_single_show}        accent="#60a5fa" />
        <KpiCard label="Overbooked Months"   value={kpi.shows.overbooked_months}
          accent={kpi.shows.overbooked_months > 0 ? '#ef4444' : '#22c55e'}
          note={kpi.shows.overbooked_months > 0 ? 'Capacity exceeded' : 'Within capacity'} />
      </ChartRow>

      <SectionHeader title="Readiness & Maintenance" />
      <ChartRow slices={[
        { value: kpi.readiness.open_items - kpi.readiness.overdue_items, color:'#4f87f5', label:'Open'    },
        { value: kpi.readiness.overdue_items,                             color:'#ef4444', label:'Overdue' },
        { value: kpi.maintenance.logs_last_30_days,                       color:'#22c55e', label:'Done (30d)' },
      ]}>
        <KpiCard label="Open Items"    value={kpi.readiness.open_items}
          accent={kpi.readiness.open_items > 5 ? '#f59e0b' : '#4f87f5'} />
        <KpiCard label="Overdue"       value={kpi.readiness.overdue_items}
          accent={kpi.readiness.overdue_items > 0 ? '#ef4444' : '#22c55e'}
          note={kpi.readiness.overdue_items > 0 ? 'Immediate attention' : 'None overdue'} />
        <KpiCard label="Maint. (30d)"  value={kpi.maintenance.logs_last_30_days}
          accent="#4f87f5" note="Recent activity" />
      </ChartRow>

      <SectionHeader title="Permits" />
      <ChartRow slices={permitSlices}>
        <KpiCard label="Approved"        value={kpi.permits.approved}
          accent="#22c55e" />
        <KpiCard label="Expiring <=30d"  value={kpi.permits.expiring_soon}
          accent={kpi.permits.expiring_soon > 0 ? '#f59e0b' : '#22c55e'}
          note={kpi.permits.expiring_soon > 0 ? 'Action needed' : 'No near expiry'} />
        <KpiCard label="Expired"         value={kpi.permits.expired}
          accent={kpi.permits.expired > 0 ? '#ef4444' : '#22c55e'}
          note={kpi.permits.expired > 0 ? 'Renew immediately' : 'All current'} />
      </ChartRow>

    </div>
  )
}
