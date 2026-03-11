'use strict';
const Database = require('better-sqlite3');
const path = require('path');

function openDb() {
  return new Database(path.join(__dirname, '../data/drones_calc.sqlite'));
}

module.exports = async function (app) {

  // ── Startup migration: add status column if missing ──────────────────────
  {
    const db = openDb();
    try {
      const cols = db.prepare('PRAGMA table_info(maintenance_log)').all();
      if (!cols.some(c => c.name === 'status')) {
        db.prepare("ALTER TABLE maintenance_log ADD COLUMN status TEXT DEFAULT 'COMPLETED'").run();
        console.log('[maintenance-schedule] Added status column to maintenance_log');
      }
    } finally {
      db.close();
    }
  }

  // ── GET /api/maintenance/upcoming ────────────────────────────────────────
  app.get('/api/maintenance/upcoming', async (_req, reply) => {
    const db = openDb();
    try {
      const rows = db.prepare(`
        SELECT ml.*,
               CASE
                 WHEN ml.asset_type = 'DRONE'   THEN du.serial_number
                 WHEN ml.asset_type = 'BATTERY' THEN bu.serial_number
               END AS asset_serial
        FROM   maintenance_log ml
        LEFT JOIN drone_unit   du ON ml.asset_type = 'DRONE'   AND ml.asset_id = du.id
        LEFT JOIN battery_unit bu ON ml.asset_type = 'BATTERY' AND ml.asset_id = bu.id
        WHERE  ml.event_date >= date('now')
        ORDER  BY ml.event_date ASC
      `).all();
      return reply.send(rows);
    } finally { db.close(); }
  });

  // ── GET /api/maintenance/alerts ──────────────────────────────────────────
  app.get('/api/maintenance/alerts', async (_req, reply) => {
    const db = openDb();
    try {
      const upcomingShows = db.prepare(`
        SELECT id, name, date, drones_required
        FROM   show_event
        WHERE  date >= date('now')
          AND  date <= date('now', '+60 days')
        ORDER  BY date ASC
      `).all();

      const droneRows = db.prepare(`
        SELECT du.id,
               du.serial_number,
               du.status,
               MAX(CASE WHEN ml.status IS NULL OR ml.status = 'COMPLETED'
                        THEN ml.event_date END) AS last_maintenance_date
        FROM   drone_unit du
        LEFT JOIN maintenance_log ml
               ON ml.asset_type = 'drone' AND ml.asset_id = du.id
        WHERE  du.status = 'ACTIVE'
        GROUP  BY du.id
      `).all();

      const today = new Date();
      const droneAlerts = [];

      for (const d of droneRows) {
        const lastDate = d.last_maintenance_date ? new Date(d.last_maintenance_date) : null;
        const daysSince = lastDate
          ? Math.floor((today.getTime() - lastDate.getTime()) / 86400000)
          : null;
        const isOverdue = daysSince === null || daysSince >= 30;

        if (isOverdue) {
          const nextShow = upcomingShows[0] ?? null;
          const daysToShow = nextShow
            ? Math.floor((new Date(nextShow.date).getTime() - today.getTime()) / 86400000)
            : null;
          droneAlerts.push({
            asset_type: 'drone',
            asset_id: d.id,
            serial_number: d.serial_number,
            last_maintenance_date: d.last_maintenance_date ?? null,
            days_since_service: daysSince,
            next_show_date: nextShow?.date ?? null,
            days_to_next_show: daysToShow,
            severity: (daysSince === null || daysSince >= 90) ? 'HIGH' : 'MEDIUM',
          });
        }
      }

      const batteryRows = db.prepare(`
        SELECT id, serial_number, cycle_count, cycle_max, health_pct
        FROM   battery_unit
        WHERE  status != 'RETIRED'
          AND  cycle_max > 0
          AND  CAST(cycle_count AS REAL) / cycle_max >= 0.80
      `).all();

      const batAlerts = batteryRows.map(b => ({
        asset_type: 'battery',
        asset_id: b.id,
        serial_number: b.serial_number,
        cycle_count: b.cycle_count,
        cycle_max: b.cycle_max,
        health_pct: b.health_pct,
        severity: (b.cycle_count / b.cycle_max) >= 0.95 ? 'HIGH' : 'MEDIUM',
      }));

      return reply.send({
        alerts: [...droneAlerts, ...batAlerts],
        upcoming_shows: upcomingShows,
      });
    } finally { db.close(); }
  });

  // ── POST /api/maintenance/schedule ──────────────────────────────────────
  app.post('/api/maintenance/schedule', async (req, reply) => {
    const { asset_type, asset_id, event_date, description, cost_sar } = req.body ?? {};
    if (!asset_type || !asset_id || !event_date) {
      return reply.status(400).send({ error: 'asset_type, asset_id, event_date are required' });
    }
    const db = openDb();
    try {
      const newId = require('crypto').randomUUID();
      const r = db.prepare(`
        INSERT INTO maintenance_log (id, asset_type, asset_id, event_date, description, cost_sar, status)
        VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')
      `).run(newId, asset_type.toUpperCase(), asset_id, event_date, description ?? '', cost_sar ?? 0);
      return reply.status(201).send({ id: newId });
    } finally { db.close(); }
  });

  // ── PATCH /api/maintenance/schedule/:id ─────────────────────────────────
  app.patch('/api/maintenance/schedule/:id', async (req, reply) => {
    const { id } = req.params;
    const { status, description, event_date, cost_sar } = req.body ?? {};
    const db = openDb();
    try {
      db.prepare(`
        UPDATE maintenance_log
        SET    status      = COALESCE(?, status),
               description = COALESCE(?, description),
               event_date  = COALESCE(?, event_date),
               cost_sar    = COALESCE(?, cost_sar)
        WHERE  id = ?
      `).run(status ?? null, description ?? null, event_date ?? null, cost_sar ?? null, id);
      return reply.send({ ok: true });
    } finally { db.close(); }
  });

  // ── GET /api/maintenance/history ────────────────────────────────────────
  app.get('/api/maintenance/history', async (_req, reply) => {
    const db = openDb();
    try {
      const rows = db.prepare(`
        SELECT ml.*,
               CASE
                 WHEN ml.asset_type = 'DRONE'   THEN du.serial_number
                 WHEN ml.asset_type = 'BATTERY' THEN bu.serial_number
               END AS asset_serial
        FROM   maintenance_log ml
        LEFT JOIN drone_unit   du ON ml.asset_type = 'DRONE'   AND ml.asset_id = du.id
        LEFT JOIN battery_unit bu ON ml.asset_type = 'BATTERY' AND ml.asset_id = bu.id
        WHERE  ml.status = 'COMPLETED'
        ORDER  BY ml.event_date DESC
      `).all();

      const totalCost = rows.reduce((sum, r) => sum + (Number(r.cost_sar) || 0), 0);

      return reply.send({ entries: rows, total_cost_sar: totalCost });
    } finally { db.close(); }
  });

  // ── DELETE /api/maintenance/schedule/:id ────────────────────────────────
  app.delete('/api/maintenance/schedule/:id', async (req, reply) => {
    const { id } = req.params;
    const db = openDb();
    try {
      db.prepare(`DELETE FROM maintenance_log WHERE id = ? AND status = 'SCHEDULED'`).run(id);
      return reply.send({ ok: true });
    } finally { db.close(); }
  });
};






