// server/routes/reporting.cjs
// Module 8: Reporting & Analytics — column names verified against live DB

const path     = require('path');
const Database = require('better-sqlite3');

function openDb() {
  return new Database(
    path.join(__dirname, '..', 'data', 'drones_calc.sqlite'),
    { readonly: true }
  );
}

module.exports = async function (app) {

  // GET /api/reporting/kpi-summary
  app.get('/api/reporting/kpi-summary', async (req, reply) => {
    const db = openDb();
    try {
      const today = new Date().toISOString().slice(0, 10);
      const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      // Fleet — drone_unit.status, drone_unit.id
      const fleet = db.prepare(`
        SELECT
          COUNT(*)                                                  AS total,
          SUM(CASE WHEN status = 'ACTIVE'  THEN 1 ELSE 0 END)      AS active,
          SUM(CASE WHEN status != 'ACTIVE' THEN 1 ELSE 0 END)      AS inactive
        FROM drone_unit
      `).get();

      // Battery — battery_unit.cycle_count, cycle_max, health_pct
      const battery = db.prepare(`
        SELECT
          COUNT(*)                                                        AS total,
          ROUND(AVG(cycle_count), 1)                                      AS avg_cycles,
          ROUND(AVG(health_pct), 1)                                       AS avg_health_pct,
          SUM(CASE WHEN cycle_count >= cycle_max THEN 1 ELSE 0 END)       AS at_max_cycles
        FROM battery_unit
      `).get();

      // Shows — show_event.date, drones_required
      const shows = db.prepare(`
        SELECT
          COUNT(*)               AS upcoming_count,
          SUM(drones_required)   AS total_drones_required,
          MAX(drones_required)   AS max_single_show
        FROM show_event
        WHERE date >= ?
      `).get(today);

      // Overbooked months
      const activeCount = fleet.active || 0;
      const overbooked = db.prepare(`
        SELECT COUNT(*) AS months
        FROM (
          SELECT strftime('%Y-%m', date) AS mo, SUM(drones_required) AS needed
          FROM show_event
          WHERE date >= ?
          GROUP BY mo
          HAVING needed > ?
        )
      `).get(today, activeCount);

      // Readiness — readiness_item.status, due_date
      const readiness = db.prepare(`
        SELECT
          SUM(CASE WHEN status != 'DONE' THEN 1 ELSE 0 END)                      AS open_items,
          SUM(CASE WHEN status != 'DONE' AND due_date < ? THEN 1 ELSE 0 END)     AS overdue_items
        FROM readiness_item
      `).get(today);

      // Maintenance — maintenance_log.event_date
      const maintenance = db.prepare(`
        SELECT COUNT(*) AS logs_last_30_days
        FROM maintenance_log
        WHERE event_date >= date(?, '-30 days')
      `).get(today);

      // Permits — permit.expires_at, status
      const permits = db.prepare(`
        SELECT
          SUM(CASE WHEN expires_at BETWEEN ? AND ? THEN 1 ELSE 0 END)  AS expiring_soon,
          SUM(CASE WHEN expires_at < ?             THEN 1 ELSE 0 END)  AS expired,
          SUM(CASE WHEN status = 'approved'        THEN 1 ELSE 0 END)  AS approved
        FROM permit
      `).get(today, in30, today);

      // Cost config
      const costs = db.prepare(`SELECT COUNT(*) AS configured_rows FROM cost_config`).get();

      reply.send({
        generated_at: new Date().toISOString(),
        fleet: {
          total:            fleet.total    ?? 0,
          active:           fleet.active   ?? 0,
          inactive:         fleet.inactive ?? 0,
          availability_pct: fleet.total
            ? Math.round((fleet.active / fleet.total) * 100)
            : 0,
        },
        battery: {
          total:          battery.total          ?? 0,
          avg_cycles:     battery.avg_cycles     ?? 0,
          avg_health_pct: battery.avg_health_pct ?? 0,
          at_max_cycles:  battery.at_max_cycles  ?? 0,
        },
        shows: {
          upcoming_count:       shows.upcoming_count       ?? 0,
          total_drones_required: shows.total_drones_required ?? 0,
          max_single_show:      shows.max_single_show      ?? 0,
          overbooked_months:    overbooked.months           ?? 0,
        },
        readiness: {
          open_items:    readiness.open_items    ?? 0,
          overdue_items: readiness.overdue_items ?? 0,
        },
        maintenance: {
          logs_last_30_days: maintenance.logs_last_30_days ?? 0,
        },
        permits: {
          expiring_soon: permits.expiring_soon ?? 0,
          expired:       permits.expired       ?? 0,
          approved:      permits.approved      ?? 0,
        },
        costs: {
          configured_rows: costs.configured_rows ?? 0,
        },
      });
    } catch (err) {
      reply.status(500).send({ error: err.message });
    } finally {
      db.close();
    }
  });

  // GET /api/reporting/export?dataset=...
  app.get('/api/reporting/export', async (req, reply) => {
    const db = openDb();
    const { dataset = 'drones' } = req.query;

    const queries = {
      drones:      `SELECT * FROM drone_unit ORDER BY id`,
      batteries:   `SELECT * FROM battery_unit ORDER BY id`,
      shows:       `SELECT * FROM show_event ORDER BY date`,
      maintenance: `SELECT * FROM maintenance_log ORDER BY event_date DESC`,
      permits:     `SELECT * FROM permit ORDER BY expires_at`,
      readiness:   `SELECT * FROM readiness_item ORDER BY due_date`,
    };

    if (!queries[dataset]) {
      db.close();
      return reply.status(400).send({ error: `Unknown dataset: ${dataset}` });
    }

    try {
      const rows = db.prepare(queries[dataset]).all();
      if (!rows.length) {
        db.close();
        return reply.send('');
      }
      const headers = Object.keys(rows[0]);
      const escape  = v => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => escape(r[h])).join(','))
      ].join('\r\n');

      db.close();
      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${dataset}_export.csv"`)
        .send(csv);
    } catch (err) {
      db.close();
      reply.status(500).send({ error: err.message });
    }
  });
};
