"use strict";
const path       = require("path");
const { createRequire } = require("module");
const cr         = createRequire(__filename);
const Database   = cr("better-sqlite3");
const { randomUUID } = require("crypto");

const DB_PATH = path.join(__dirname, "..", "data", "drones_calc.sqlite");
function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS show_drone_allocation (
      id           TEXT PRIMARY KEY,
      show_id      TEXT NOT NULL,
      drone_id     TEXT NOT NULL,
      assigned_at  TEXT NOT NULL,
      assigned_by  TEXT,
      notes        TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      UNIQUE(show_id, drone_id)
    );
  `);
}

module.exports = async function allocationsRoutes(fastify) {
  const db = openDb();
  migrate(db);

  // GET /api/allocations?show_id=xxx  — list allocations for a show
  fastify.get("/api/allocations", async (req) => {
    const { show_id } = req.query;
    if (!show_id) return { ok: true, items: [] };
    const items = db.prepare(`
      SELECT a.*, d.serial_number, d.model_id, d.status AS drone_status
      FROM show_drone_allocation a
      JOIN drone_unit d ON d.id = a.drone_id
      WHERE a.show_id = ?
      ORDER BY a.assigned_at ASC
    `).all(show_id);
    return { ok: true, items };
  });

  // GET /api/allocations/available?show_id=xxx — ACTIVE drones not yet assigned to this show
  fastify.get("/api/allocations/available", async (req) => {
    const { show_id } = req.query;
    if (!show_id) return { ok: true, items: [] };
    const items = db.prepare(`
      SELECT d.id, d.serial_number, d.model_id, d.status
      FROM drone_unit d
      WHERE d.status = 'ACTIVE'
        AND d.id NOT IN (
          SELECT drone_id FROM show_drone_allocation WHERE show_id = ?
        )
      ORDER BY d.serial_number ASC
    `).all(show_id);
    return { ok: true, items };
  });

  // POST /api/allocations — assign a drone to a show
  fastify.post("/api/allocations", async (req, reply) => {
    const { show_id, drone_id, assigned_by, notes } = req.body ?? {};
    if (!show_id || !drone_id) {
      reply.code(400); return { ok: false, error: "show_id and drone_id are required" };
    }
    // Verify show exists
    const show = db.prepare("SELECT id, drones_required FROM show_event WHERE id = ?").get(show_id);
    if (!show) { reply.code(404); return { ok: false, error: "Show not found" }; }
    // Verify drone exists and is ACTIVE
    const drone = db.prepare("SELECT id, status FROM drone_unit WHERE id = ?").get(drone_id);
    if (!drone) { reply.code(404); return { ok: false, error: "Drone not found" }; }
    if (drone.status !== "ACTIVE") {
      reply.code(400); return { ok: false, error: "Only ACTIVE drones can be allocated" };
    }
    // Check capacity
    const current = db.prepare("SELECT COUNT(*) AS c FROM show_drone_allocation WHERE show_id = ?").get(show_id);
    if (current.c >= show.drones_required) {
      reply.code(400);
      return { ok: false, error: `Show is already at capacity (${show.drones_required} drones required)` };
    }

    const now = new Date().toISOString();
    const id  = randomUUID();
    try {
      db.prepare(`
        INSERT INTO show_drone_allocation
          (id, show_id, drone_id, assigned_at, assigned_by, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, show_id, drone_id, now, assigned_by ?? null, notes?.trim() ?? null, now, now);
    } catch (e) {
      if (e.message?.includes("UNIQUE")) {
        reply.code(409); return { ok: false, error: "Drone already allocated to this show" };
      }
      throw e;
    }
    reply.code(201);
    return { ok: true, allocation: db.prepare("SELECT * FROM show_drone_allocation WHERE id=?").get(id) };
  });

  // DELETE /api/allocations/:id — remove allocation
  fastify.delete("/api/allocations/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM show_drone_allocation WHERE id=?").get(req.params.id);
    if (!row) { reply.code(404); return { ok: false, error: "Not found" }; }
    db.prepare("DELETE FROM show_drone_allocation WHERE id=?").run(req.params.id);
    return { ok: true };
  });
};
