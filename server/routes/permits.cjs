"use strict";
/**
 * Drones Calc - Module 4: Permit & Site Lifecycle
 *
 * Routes:
 *   GET    /api/permits            -> list all permits (filter: ?show_id=)
 *   POST   /api/permits            -> create permit  [auth required]
 *   PATCH  /api/permits/:id        -> update permit  [auth required]
 *   DELETE /api/permits/:id        -> delete permit  [auth required]
 */
const path     = require("node:path");
const crypto   = require("node:crypto");
const Database = require("better-sqlite3");
const { validateToken } = require("../tokenStore.cjs");

const DB_PATH = path.join(__dirname, "..", "data", "drones_calc.sqlite");

const VALID_STATUS = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "EXPIRED"];

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
    CREATE TABLE IF NOT EXISTS permit (
      id               TEXT PRIMARY KEY,
      show_id          TEXT NOT NULL,
      permit_type      TEXT NOT NULL,
      authority        TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'DRAFT'
                       CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','EXPIRED')),
      reference_number TEXT NULL,
      submitted_at     TEXT NULL,
      approved_at      TEXT NULL,
      expires_at       TEXT NULL,
      notes            TEXT NULL,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_permit_show_id ON permit(show_id);
    CREATE INDEX IF NOT EXISTS idx_permit_status  ON permit(status);
  `);
  return db;
}

module.exports = async function permitsRoutes(fastify) {
  const db = openDb();

  const selAll = db.prepare(
    "SELECT * FROM permit ORDER BY created_at DESC"
  );
  const selByShow = db.prepare(
    "SELECT * FROM permit WHERE show_id = ? ORDER BY created_at DESC"
  );
  const insert = db.prepare(`
    INSERT INTO permit
      (id, show_id, permit_type, authority, status, reference_number,
       submitted_at, approved_at, expires_at, notes)
    VALUES
      (@id, @show_id, @permit_type, @authority, @status, @reference_number,
       @submitted_at, @approved_at, @expires_at, @notes)
  `);
  const update = db.prepare(`
    UPDATE permit
    SET permit_type = @permit_type, authority = @authority, status = @status,
        reference_number = @reference_number, submitted_at = @submitted_at,
        approved_at = @approved_at, expires_at = @expires_at,
        notes = @notes, updated_at = datetime('now')
    WHERE id = @id
  `);
  const remove = db.prepare("DELETE FROM permit WHERE id = ?");

  fastify.get("/api/permits", async function (req) {
    const showId = String(req.query?.show_id || "").trim();
    const items  = showId ? selByShow.all(showId) : selAll.all();
    return { ok: true, items };
  });

  fastify.post("/api/permits", { preHandler: requireAuth }, async function (req, reply) {
    const body   = req.body && typeof req.body === "object" ? req.body : {};
    const showId = String(body.show_id      || "").trim();
    const type   = String(body.permit_type  || "").trim();
    const auth   = String(body.authority    || "").trim();
    const status = String(body.status       || "DRAFT").trim().toUpperCase();
    const ref    = String(body.reference_number || "").trim() || null;
    const subAt  = String(body.submitted_at || "").trim() || null;
    const appAt  = String(body.approved_at  || "").trim() || null;
    const expAt  = String(body.expires_at   || "").trim() || null;
    const notes  = String(body.notes        || "").trim() || null;

    if (!showId) return reply.code(400).send({ ok: false, error: "show_id required" });
    if (!type)   return reply.code(400).send({ ok: false, error: "permit_type required" });
    if (!auth)   return reply.code(400).send({ ok: false, error: "authority required" });
    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "invalid status" });

    const id = crypto.randomUUID();
    insert.run({ id, show_id: showId, permit_type: type, authority: auth,
                 status, reference_number: ref, submitted_at: subAt,
                 approved_at: appAt, expires_at: expAt, notes });
    return reply.code(201).send({ ok: true, id });
  });

  fastify.patch("/api/permits/:id", { preHandler: requireAuth }, async function (req, reply) {
    const id   = String(req.params.id || "").trim();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });

    const existing = db.prepare("SELECT * FROM permit WHERE id = ?").get(id);
    if (!existing) return reply.code(404).send({ ok: false, error: "permit not found" });

    const type   = String(body.permit_type       ?? existing.permit_type).trim();
    const auth   = String(body.authority         ?? existing.authority).trim();
    const status = String(body.status            ?? existing.status).trim().toUpperCase();
    const ref    = String(body.reference_number  ?? existing.reference_number ?? "").trim() || null;
    const subAt  = String(body.submitted_at      ?? existing.submitted_at  ?? "").trim() || null;
    const appAt  = String(body.approved_at       ?? existing.approved_at   ?? "").trim() || null;
    const expAt  = String(body.expires_at        ?? existing.expires_at    ?? "").trim() || null;
    const notes  = String(body.notes             ?? existing.notes         ?? "").trim() || null;

    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "invalid status" });

    const result = update.run({ id, permit_type: type, authority: auth, status,
                                 reference_number: ref, submitted_at: subAt,
                                 approved_at: appAt, expires_at: expAt, notes });
    if (result.changes === 0) return reply.code(404).send({ ok: false, error: "permit not found" });
    return { ok: true };
  });

  fastify.delete("/api/permits/:id", { preHandler: requireAuth }, async function (req, reply) {
    const id = String(req.params.id || "").trim();
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    const result = remove.run(id);
    if (result.changes === 0) return reply.code(404).send({ ok: false, error: "permit not found" });
    return { ok: true };
  });
};