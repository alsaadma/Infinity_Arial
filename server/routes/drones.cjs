"use strict";
/**
 * Drones Calc - Module 2: Asset Registry (Drones)
 * GET  is open   - Command dashboard reads fleet counts without auth
 * POST / DELETE / PATCH require a valid Bearer token
 */
const path     = require("node:path");
const Database = require("better-sqlite3");
const { validateToken } = require("../tokenStore.cjs");

const DB_PATH      = path.join(__dirname, "..", "data", "drones_calc.sqlite");
const VALID_STATUS = ["ACTIVE", "MAINTENANCE", "QUARANTINED", "RETIRED"];

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
  db.exec(`
    CREATE TABLE IF NOT EXISTS drone_unit (
      id                 TEXT PRIMARY KEY,
      serial_number      TEXT NULL,
      model_id           TEXT NULL,
      status             TEXT NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','MAINTENANCE','QUARANTINED','RETIRED')),
      status_reason      TEXT NULL,
      updated_by_user_id TEXT NULL,
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_drone_unit_status ON drone_unit(status);
    CREATE TABLE IF NOT EXISTS drone_status_log (
      id          TEXT PRIMARY KEY,
      drone_id    TEXT NOT NULL,
      from_status TEXT NULL,
      to_status   TEXT NOT NULL,
      reason      TEXT NULL,
      changed_by  TEXT NULL,
      changed_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dsl_drone_id ON drone_status_log(drone_id);
  `);
  return db;
}

module.exports = async function dronesRoutes(fastify) {
  const db = openDb();

  const selAll = db.prepare(
    "SELECT id, serial_number, model_id, status, status_reason, updated_by_user_id, created_at, updated_at FROM drone_unit ORDER BY created_at DESC"
  );
  const insert = db.prepare(
    "INSERT INTO drone_unit (id, serial_number, model_id, status) VALUES (@id, @serial_number, @model_id, @status)"
  );
  const patchStatus = db.prepare(`
    UPDATE drone_unit
    SET status = @status, status_reason = @reason,
        updated_by_user_id = @updated_by, updated_at = datetime('now')
    WHERE id = @id
  `);

  fastify.get("/api/fleet/drones", async function () {
    return { ok: true, items: selAll.all() };
  });

  fastify.post("/api/fleet/drones", { preHandler: requireAuth }, async function (req, reply) {
    const body   = req.body && typeof req.body === "object" ? req.body : {};
    const serial = String(body.serial_number || "").trim() || null;
    const model  = String(body.model_id      || "").trim() || null;
    const status = String(body.status        || "ACTIVE").trim().toUpperCase();

    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "invalid status" });

    const id = crypto.randomUUID();
    insert.run({ id, serial_number: serial, model_id: model, status });
    return reply.code(201).send({ ok: true, id });
  });

  fastify.delete("/api/fleet/drones/:id", { preHandler: requireAuth }, async function (req, reply) {
    const id = String(req.params.id || "").trim();
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    const result = db.prepare("DELETE FROM drone_unit WHERE id = ?").run(id);
    if (result.changes === 0) return reply.code(404).send({ ok: false, error: "drone not found" });
    return { ok: true };
  });

  const insertLog = db.prepare(`
    INSERT INTO drone_status_log (id, drone_id, from_status, to_status, reason, changed_by)
    VALUES (@id, @drone_id, @from_status, @to_status, @reason, @changed_by)
  `);
  const selLog = db.prepare(
    "SELECT id, from_status, to_status, reason, changed_by, changed_at FROM drone_status_log WHERE drone_id = ? ORDER BY changed_at DESC LIMIT 50"
  );

  // RETIRED is a terminal state — no transitions out
  function validateTransition(from, to) {
    if (from === to) return null;
    if (from === "RETIRED") return "RETIRED drones cannot be transitioned to another status.";
    return null;
  }

  fastify.patch("/api/fleet/drones/:id/status", { preHandler: requireAuth }, async function (req, reply) {
    const id     = String(req.params.id || "").trim();
    const body   = req.body && typeof req.body === "object" ? req.body : {};
    const status = String(body.status     || "").trim().toUpperCase();
    const reason = String(body.reason     || "").trim() || null;
    const by     = String(body.updated_by || "").trim() || null;

    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "invalid status" });

    const existing = db.prepare("SELECT status FROM drone_unit WHERE id = ?").get(id);
    if (!existing) return reply.code(404).send({ ok: false, error: "drone not found" });

    const transErr = validateTransition(existing.status, status);
    if (transErr) return reply.code(422).send({ ok: false, error: transErr });

    const logId = crypto.randomUUID();
    db.transaction(() => {
      patchStatus.run({ id, status, reason, updated_by: by });
      insertLog.run({
        id: logId, drone_id: id,
        from_status: existing.status, to_status: status,
        reason, changed_by: by,
      });
    })();

    return { ok: true, from_status: existing.status, to_status: status };
  });

  fastify.get("/api/fleet/drones/:id/log", async function (req, reply) {
    const id = String(req.params.id || "").trim();
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    return { ok: true, items: selLog.all(id) };
  });
};
