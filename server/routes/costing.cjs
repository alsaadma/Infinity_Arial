'use strict';
/**
 * Module 6 — Costing & Depreciation
 * Routes:
 *   GET  /api/costing/summary       fleet depreciation + maintenance totals
 *   GET  /api/costing/config        read all cost_config rows
 *   PUT  /api/costing/config/:key   upsert a cost_config key
 *   GET  /api/costing/maintenance   list maintenance_log (optional ?asset_id=)
 *   POST /api/costing/maintenance   create maintenance event
 */
const Database = require('better-sqlite3');
const path     = require('path');
const { randomUUID } = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'drones_calc.sqlite');

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  return db;
}

function getConfig(db) {
  const rows = db.prepare('SELECT key, value FROM cost_config').all();
  const cfg  = {};
  for (const r of rows) cfg[r.key] = r.value;
  return {
    useful_life_years:        parseFloat(cfg.useful_life_years        ?? '3'),
    expected_shows_per_year:  parseFloat(cfg.expected_shows_per_year  ?? '45'),
    residual_value_pct:       parseFloat(cfg.residual_value_pct       ?? '0.15'),
  };
}

module.exports = async function costingRoutes(app) {

  // ── GET /api/costing/summary ────────────────────────────────
  app.get('/api/costing/summary', async () => {
    const db = openDb();
    try {
      const cfg = getConfig(db);

      // Drone depreciation
      const droneRows = db.prepare(
        "SELECT purchase_price_sar FROM drone_unit WHERE status = 'ACTIVE' AND purchase_price_sar IS NOT NULL"
      ).all();
      const droneCount  = droneRows.length;
      const droneAvgCost = droneCount > 0
        ? droneRows.reduce((s, r) => s + r.purchase_price_sar, 0) / droneCount
        : 0;
      const droneDepPerShow = droneAvgCost > 0
        ? (droneAvgCost * (1 - cfg.residual_value_pct)) /
          (cfg.useful_life_years * cfg.expected_shows_per_year)
        : 0;

      // Battery depreciation
      const batRows = db.prepare(
        "SELECT purchase_price_sar, cycle_max FROM battery_unit WHERE status = 'ACTIVE' AND purchase_price_sar IS NOT NULL"
      ).all();
      const batCount    = batRows.length;
      const batAvgCost  = batCount > 0
        ? batRows.reduce((s, r) => s + r.purchase_price_sar, 0) / batCount
        : 0;
      // Battery: cost / cycle_max gives cost per flight; multiply by ~4 flights/show
      const avgCycleMax = batCount > 0
        ? batRows.reduce((s, r) => s + (r.cycle_max || 300), 0) / batCount
        : 300;
      const batDepPerShow = batAvgCost > 0
        ? (batAvgCost / avgCycleMax) * 4
        : 0;

      // Maintenance totals (last 12 months)
      const maintTotal = db.prepare(
        "SELECT COALESCE(SUM(cost_sar), 0) AS total FROM maintenance_log WHERE event_date >= date('now', '-12 months')"
      ).get().total;

      const maintPerShow = cfg.expected_shows_per_year > 0
        ? maintTotal / cfg.expected_shows_per_year
        : 0;

      return {
        ok: true,
        config: cfg,
        fleet: {
          active_drones_with_price: droneCount,
          active_batteries_with_price: batCount,
        },
        depreciation: {
          drone_avg_cost_sar:       Math.round(droneAvgCost * 100) / 100,
          drone_dep_per_show_sar:   Math.round(droneDepPerShow * 100) / 100,
          battery_avg_cost_sar:     Math.round(batAvgCost * 100) / 100,
          battery_dep_per_show_sar: Math.round(batDepPerShow * 100) / 100,
        },
        maintenance: {
          total_last_12m_sar: Math.round(maintTotal * 100) / 100,
          per_show_sar:       Math.round(maintPerShow * 100) / 100,
        },
        cost_floor_per_show_sar: Math.round(
          (droneDepPerShow + batDepPerShow + maintPerShow) * 100
        ) / 100,
      };
    } finally {
      try { db.close(); } catch {}
    }
  });

  // ── GET /api/costing/config ─────────────────────────────────
  app.get('/api/costing/config', async () => {
    const db = openDb();
    try {
      const rows = db.prepare('SELECT key, value, updated_at FROM cost_config').all();
      return { ok: true, config: rows };
    } finally {
      try { db.close(); } catch {}
    }
  });

  // ── PUT /api/costing/config/:key ────────────────────────────
  app.put('/api/costing/config/:key', async (req, reply) => {
    const { key }   = req.params;
    const { value } = req.body ?? {};
    const allowed   = ['useful_life_years', 'expected_shows_per_year', 'residual_value_pct'];
    if (!allowed.includes(key)) {
      return reply.status(400).send({ ok: false, error: `Unknown config key: ${key}` });
    }
    if (value === undefined || value === null) {
      return reply.status(400).send({ ok: false, error: 'value is required' });
    }
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      return reply.status(400).send({ ok: false, error: 'value must be a non-negative number' });
    }
    const db = openDb();
    try {
      db.prepare(
        "INSERT INTO cost_config (key, value, updated_at) VALUES (?, ?, datetime('now')) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      ).run(key, String(num));
      return { ok: true, key, value: String(num) };
    } finally {
      try { db.close(); } catch {}
    }
  });

  // ── GET /api/costing/maintenance ────────────────────────────
  app.get('/api/costing/maintenance', async (req) => {
    const { asset_id, asset_type, limit = '100' } = req.query ?? {};
    const db = openDb();
    try {
      let sql    = 'SELECT * FROM maintenance_log WHERE 1=1';
      const args = [];
      if (asset_id)   { sql += ' AND asset_id = ?';   args.push(asset_id); }
      if (asset_type) { sql += ' AND asset_type = ?';  args.push(asset_type.toUpperCase()); }
      sql += ' ORDER BY event_date DESC LIMIT ?';
      args.push(Math.min(parseInt(limit) || 100, 500));
      const rows = db.prepare(sql).all(...args);
      return { ok: true, count: rows.length, items: rows };
    } finally {
      try { db.close(); } catch {}
    }
  });

  // ── POST /api/costing/maintenance ───────────────────────────
  app.post('/api/costing/maintenance', async (req, reply) => {
    const { asset_type, asset_id, cost_sar, event_date, description, created_by } = req.body ?? {};
    if (!asset_type || !asset_id || cost_sar === undefined || !event_date) {
      return reply.status(400).send({
        ok: false,
        error: 'asset_type, asset_id, cost_sar, event_date are required',
      });
    }
    if (!['DRONE', 'BATTERY'].includes(asset_type.toUpperCase())) {
      return reply.status(400).send({ ok: false, error: "asset_type must be DRONE or BATTERY" });
    }
    const costNum = parseFloat(cost_sar);
    if (isNaN(costNum) || costNum < 0) {
      return reply.status(400).send({ ok: false, error: 'cost_sar must be >= 0' });
    }
    const db = openDb();
    try {
      const id = randomUUID();
      db.prepare(
        'INSERT INTO maintenance_log (id, asset_type, asset_id, cost_sar, event_date, description, created_by) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, asset_type.toUpperCase(), asset_id, costNum, event_date, description ?? null, created_by ?? null);
      const row = db.prepare('SELECT * FROM maintenance_log WHERE id = ?').get(id);
      return reply.status(201).send({ ok: true, item: row });
    } finally {
      try { db.close(); } catch {}
    }
  });
};
