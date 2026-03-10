"use strict";
/**
 * Drones Calc — Module 3: Show / Event Engine
 *
 * Routes:
 *   GET    /api/shows            -> list all shows
 *   GET    /api/shows/summary    -> upcoming counts + peak demand
 *   POST   /api/shows            -> create show  [auth required]
 *   PATCH  /api/shows/:id        -> update show  [auth required]
 *   DELETE /api/shows/:id        -> delete show  [auth required]
 */
const path     = require("node:path");
const crypto   = require("node:crypto");
const Database = require("better-sqlite3");
const { validateToken } = require("../tokenStore.cjs");

const DB_PATH = path.join(__dirname, "..", "data", "drones_calc.sqlite");

const VALID_STATUS = ["PLANNED", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"];

function requireAuth(req, reply, done) {
  const auth  = String(req.headers["authorization"] || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!validateToken(token))
    return reply.code(401).send({ ok: false, error: "Unauthorized" });
  done();
}

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS show_event (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      date             TEXT NOT NULL,
      venue            TEXT NULL,
      drones_required  INTEGER NOT NULL DEFAULT 0,
      status           TEXT NOT NULL DEFAULT 'PLANNED'
                       CHECK (status IN ('PLANNED','CONFIRMED','ACTIVE','COMPLETED','CANCELLED')),
      notes            TEXT NULL,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_show_event_date   ON show_event(date);
    CREATE INDEX IF NOT EXISTS idx_show_event_status ON show_event(status);
  `);
  return db;
}

module.exports = async function showsRoutes(fastify) {
  const db = openDb();

  const selAll = db.prepare(
    "SELECT id, name, date, venue, drones_required, status, notes, created_at, updated_at FROM show_event ORDER BY date ASC"
  );
  const insert = db.prepare(`
    INSERT INTO show_event (id, name, date, venue, drones_required, status, notes)
    VALUES (@id, @name, @date, @venue, @drones_required, @status, @notes)
  `);
  const update = db.prepare(`
    UPDATE show_event
    SET name = @name, date = @date, venue = @venue,
        drones_required = @drones_required, status = @status,
        notes = @notes, updated_at = datetime('now')
    WHERE id = @id
  `);
  const remove = db.prepare("DELETE FROM show_event WHERE id = ?");

  fastify.get("/api/shows", async function () {
    return { ok: true, items: selAll.all() };
  });

  fastify.get("/api/shows/summary", async function () {
    const summary = db.prepare(`
      SELECT
        COUNT(*) AS total_shows,
        SUM(CASE WHEN date >= date('now') AND status != 'CANCELLED' THEN 1 ELSE 0 END) AS upcoming_count,
        SUM(CASE WHEN date >= date('now') AND status != 'CANCELLED' THEN drones_required ELSE 0 END) AS upcoming_drones_required,
        MAX(CASE WHEN date >= date('now') AND status != 'CANCELLED' THEN drones_required ELSE 0 END) AS peak_drones_required
      FROM show_event
    `).get();
    const next = db.prepare(`
      SELECT id, name, date, venue, drones_required, status FROM show_event
      WHERE date >= date('now') AND status != 'CANCELLED'
      ORDER BY date ASC LIMIT 1
    `).get() || null;
    return { ok: true, summary, next_show: next };
  });

  fastify.post("/api/shows", { preHandler: requireAuth }, async function (req, reply) {
    const body  = req.body && typeof req.body === "object" ? req.body : {};
    const name  = String(body.name  || "").trim();
    const date  = String(body.date  || "").trim();
    const venue = String(body.venue || "").trim() || null;
    const drones = Number(body.drones_required ?? 0);
    const status = String(body.status || "PLANNED").trim().toUpperCase();
    const notes  = String(body.notes || "").trim() || null;

    if (!name)  return reply.code(400).send({ ok: false, error: "name required" });
    if (!date)  return reply.code(400).send({ ok: false, error: "date required (YYYY-MM-DD)" });
    if (!Number.isInteger(drones) || drones < 0)
      return reply.code(400).send({ ok: false, error: "drones_required must be a non-negative integer" });
    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "status must be PLANNED|CONFIRMED|ACTIVE|COMPLETED|CANCELLED" });

    const id = crypto.randomUUID();
    insert.run({ id, name, date, venue, drones_required: drones, status, notes });
    return reply.code(201).send({ ok: true, id });
  });

  fastify.patch("/api/shows/:id", { preHandler: requireAuth }, async function (req, reply) {
    const id    = String(req.params.id || "").trim();
    const body  = req.body && typeof req.body === "object" ? req.body : {};

    if (!id) return reply.code(400).send({ ok: false, error: "id required" });

    const existing = db.prepare("SELECT * FROM show_event WHERE id = ?").get(id);
    if (!existing) return reply.code(404).send({ ok: false, error: "show not found" });

    const name   = String(body.name  ?? existing.name).trim();
    const date   = String(body.date  ?? existing.date).trim();
    const venue  = String(body.venue ?? existing.venue ?? "").trim() || null;
    const drones = body.drones_required !== undefined ? Number(body.drones_required) : existing.drones_required;
    const status = String(body.status ?? existing.status).trim().toUpperCase();
    const notes  = String(body.notes  ?? existing.notes ?? "").trim() || null;

    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "invalid status" });

    const result = update.run({ id, name, date, venue, drones_required: drones, status, notes });
    if (result.changes === 0) return reply.code(404).send({ ok: false, error: "show not found" });
    return { ok: true };
  });

  fastify.delete("/api/shows/:id", { preHandler: requireAuth }, async function (req, reply) {
    const id = String(req.params.id || "").trim();
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    const result = remove.run(id);
    if (result.changes === 0) return reply.code(404).send({ ok: false, error: "show not found" });
    return { ok: true };
  });
};
