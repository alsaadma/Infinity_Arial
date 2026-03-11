"use strict";
/**
 * Drones Calc - Module 5: Operational Readiness (manual checklist items)
 *
 * Routes:
 *   GET    /api/readiness/items          -> list all items (filter: ?show_id=)
 *   POST   /api/readiness/items          -> create item  [auth]
 *   PATCH  /api/readiness/items/:id      -> update item  [auth]
 *   DELETE /api/readiness/items/:id      -> delete item  [auth]
 */
const path     = require("node:path");
const crypto   = require("node:crypto");
const Database = require("better-sqlite3");
const { validateToken } = require("../tokenStore.cjs");

const DB_PATH      = path.join(__dirname, "..", "data", "drones_calc.sqlite");
const VALID_STATUS = ["OPEN", "IN_PROGRESS", "DONE", "BLOCKED"];

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
    CREATE TABLE IF NOT EXISTS readiness_item (
      id         TEXT PRIMARY KEY,
      show_id    TEXT NOT NULL,
      title      TEXT NOT NULL,
      owner      TEXT NULL,
      due_date   TEXT NULL,
      status     TEXT NOT NULL DEFAULT 'OPEN'
                 CHECK (status IN ('OPEN','IN_PROGRESS','DONE','BLOCKED')),
      notes      TEXT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ri_show_id ON readiness_item(show_id);
    CREATE INDEX IF NOT EXISTS idx_ri_status  ON readiness_item(status);
  `);
  return db;
}

module.exports = async function readinessRoutes(fastify) {
  const db = openDb();

  const selAll    = db.prepare("SELECT * FROM readiness_item ORDER BY due_date ASC, created_at ASC");
  const selByShow = db.prepare("SELECT * FROM readiness_item WHERE show_id = ? ORDER BY due_date ASC, created_at ASC");
  const insert    = db.prepare(`
    INSERT INTO readiness_item (id, show_id, title, owner, due_date, status, notes)
    VALUES (@id, @show_id, @title, @owner, @due_date, @status, @notes)
  `);
  const update    = db.prepare(`
    UPDATE readiness_item
    SET title = @title, owner = @owner, due_date = @due_date,
        status = @status, notes = @notes, updated_at = datetime('now')
    WHERE id = @id
  `);
  const remove    = db.prepare("DELETE FROM readiness_item WHERE id = ?");

  fastify.get("/api/readiness/items", async function (req) {
    const showId = String(req.query?.show_id || "").trim();
    return { ok: true, items: showId ? selByShow.all(showId) : selAll.all() };
  });

  fastify.post("/api/readiness/items", { preHandler: requireAuth }, async function (req, reply) {
    const body   = req.body && typeof req.body === "object" ? req.body : {};
    const showId = String(body.show_id  || "").trim();
    const title  = String(body.title    || "").trim();
    const owner  = String(body.owner    || "").trim() || null;
    const due    = String(body.due_date || "").trim() || null;
    const status = String(body.status   || "OPEN").trim().toUpperCase();
    const notes  = String(body.notes    || "").trim() || null;

    if (!showId) return reply.code(400).send({ ok: false, error: "show_id required" });
    if (!title)  return reply.code(400).send({ ok: false, error: "title required" });
    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "invalid status" });

    const id = crypto.randomUUID();
    insert.run({ id, show_id: showId, title, owner, due_date: due, status, notes });
    return reply.code(201).send({ ok: true, id });
  });

  fastify.patch("/api/readiness/items/:id", { preHandler: requireAuth }, async function (req, reply) {
    const id   = String(req.params.id || "").trim();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });

    const ex = db.prepare("SELECT * FROM readiness_item WHERE id = ?").get(id);
    if (!ex) return reply.code(404).send({ ok: false, error: "item not found" });

    const title  = String(body.title    ?? ex.title).trim();
    const owner  = String(body.owner    ?? ex.owner  ?? "").trim() || null;
    const due    = String(body.due_date ?? ex.due_date ?? "").trim() || null;
    const status = String(body.status   ?? ex.status).trim().toUpperCase();
    const notes  = String(body.notes    ?? ex.notes  ?? "").trim() || null;

    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "invalid status" });

    const r = update.run({ id, title, owner, due_date: due, status, notes });
    if (r.changes === 0) return reply.code(404).send({ ok: false, error: "item not found" });
    return { ok: true };
  });

  fastify.delete("/api/readiness/items/:id", { preHandler: requireAuth }, async function (req, reply) {
    const id = String(req.params.id || "").trim();
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    const r = remove.run(id);
    if (r.changes === 0) return reply.code(404).send({ ok: false, error: "item not found" });
    return { ok: true };
  });
};