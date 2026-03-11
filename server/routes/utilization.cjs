'use strict';
const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'drones_calc.sqlite');

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  return db;
}

function cols(db, tableName) {
  try {
    return db.prepare('PRAGMA table_info(' + tableName + ')').all().map(function(c){ return c.name; });
  } catch(_) { return []; }
}

module.exports = async function utilizationRoutes(app) {

  // GET /api/utilization/summary
  app.get('/api/utilization/summary', async function(_req, _reply) {
    const db = openDb();
    try {
      const dc = cols(db, 'drone_unit');
      const bc = cols(db, 'battery_unit');
      const sc = cols(db, 'show_event');

      const hDS = dc.includes('status');
      const hCC = bc.includes('cycle_count');
      const hMC = bc.includes('cycle_max');
      const hSD = sc.includes('date');
      const hDR = sc.includes('drones_required');
      const hSS = sc.includes('status');

      const total = db.prepare('SELECT COUNT(*) as n FROM drone_unit').get().n || 0;
      let active = total, maint = 0, ret = 0;
      if (hDS) {
        active = db.prepare("SELECT COUNT(*) as n FROM drone_unit WHERE status = 'ACTIVE'").get().n || 0;
        maint  = db.prepare("SELECT COUNT(*) as n FROM drone_unit WHERE status = 'MAINTENANCE'").get().n || 0;
        ret    = db.prepare("SELECT COUNT(*) as n FROM drone_unit WHERE status IN ('RETIRED','QUARANTINED','DAMAGED')").get().n || 0;
      }

      let upcoming = 0, needed = 0, overbooked = 0;
      if (hSD && hDR) {
        const sf = hSS ? "AND status NOT IN ('CANCELLED','REJECTED')" : '';
        const sr = db.prepare(
          "SELECT COUNT(*) as n, COALESCE(SUM(drones_required),0) as needed " +
          "FROM show_event WHERE date >= date('now') " + sf
        ).get();
        upcoming   = sr.n      || 0;
        needed     = sr.needed || 0;
        overbooked = db.prepare(
          "SELECT COUNT(*) as n FROM show_event WHERE date >= date('now') " + sf +
          " AND drones_required > ?"
        ).get(active).n || 0;
      }

      let stress = null, crit = 0;
      if (hCC && hMC) {
        const br = db.prepare(
          "SELECT AVG(CAST(cycle_count AS REAL) / NULLIF(cycle_max, 0)) * 100 AS s, " +
          "COUNT(CASE WHEN CAST(cycle_count AS REAL) / NULLIF(cycle_max, 1) >= 0.80 THEN 1 END) AS c " +
          "FROM battery_unit WHERE cycle_max > 0"
        ).get();
        stress = br.s != null ? Math.round(br.s * 10) / 10 : null;
        crit   = br.c || 0;
      }

      const utilPct = active > 0 ? Math.min(Math.round((needed / active) * 100), 9999) : 0;

      return {
        ok: true,
        computed_at: new Date().toISOString(),
        fleet:       { total, active, maintenance: maint, retired: ret, idle: Math.max(0, active - needed) },
        shows:       { upcoming, total_drones_needed: needed, overbooked },
        utilization: { drone_utilization_pct: utilPct, battery_stress_pct: stress, critical_batteries: crit },
        schema_coverage: { drone_status: hDS, battery_cycles: hCC && hMC, show_demand: hSD && hDR }
      };
    } finally {
      try { db.close(); } catch(_) {}
    }
  });

  // GET /api/utilization/monthly
  app.get('/api/utilization/monthly', async function(_req, _reply) {
    const db = openDb();
    try {
      const sc  = cols(db, 'show_event');
      const dc  = cols(db, 'drone_unit');
      const hSt = dc.includes('status');

      const cap = hSt
        ? db.prepare("SELECT COUNT(*) as n FROM drone_unit WHERE status = 'ACTIVE'").get().n || 0
        : db.prepare('SELECT COUNT(*) as n FROM drone_unit').get().n || 0;

      if (!sc.includes('date') || !sc.includes('drones_required')) {
        return { ok: true, capacity_per_month: cap, months: [], note: 'show_event missing date or drones_required' };
      }

      const sf   = sc.includes('status') ? "AND status NOT IN ('CANCELLED','REJECTED')" : '';
      const rows = db.prepare(
        "SELECT strftime('%Y-%m', date) AS month, COUNT(*) AS show_count, " +
        "COALESCE(SUM(drones_required), 0) AS drones_allocated, MAX(drones_required) AS peak " +
        "FROM show_event " +
        "WHERE date >= date('now', 'start of month') " +
        "  AND date <  date('now', '+6 months') " + sf +
        " GROUP BY month ORDER BY month"
      ).all();

      return {
        ok: true,
        capacity_per_month: cap,
        months: rows.map(function(r) {
          return {
            month:            r.month,
            show_count:       r.show_count,
            drones_allocated: r.drones_allocated,
            peak_show_size:   r.peak,
            utilization_pct:  cap > 0 ? Math.round((r.drones_allocated / cap) * 100) : 0,
            overbooked:       r.drones_allocated > cap
          };
        })
      };
    } finally {
      try { db.close(); } catch(_) {}
    }
  });
};