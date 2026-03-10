/**
 * Drones Calc Level 3 — Overrides API (CommonJS Fastify plugin)
 * DB: server/data/drones_calc.sqlite  (unified with server.js)
 *
 * Routes:
 *   GET /api/overrides
 *   PUT /api/overrides/:gapId
 */
"use strict";
const path     = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "..", "data", "drones_calc.sqlite");

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS gap_override (
      gap_id     TEXT PRIMARY KEY,
      status     TEXT NULL,
      owner      TEXT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

module.exports = async function overridesRoutes(fastify) {
  const db = openDb();

  const selAll = db.prepare(
    "SELECT gap_id, status, owner, updated_at FROM gap_override ORDER BY gap_id"
  );
  const upsert = db.prepare(`
    INSERT INTO gap_override (gap_id, status, owner, updated_at)
    VALUES (@gap_id, @status, @owner, @updated_at)
    ON CONFLICT(gap_id) DO UPDATE SET
      status     = excluded.status,
      owner      = excluded.owner,
      updated_at = excluded.updated_at
  `);

  fastify.get("/api/overrides", async function () {
    return {
      items: selAll.all().map((r) => ({
        gapId:     r.gap_id,
        status:    r.status    ?? null,
        owner:     r.owner     ?? null,
        updatedAt: r.updated_at,
      })),
    };
  });

  fastify.put("/api/overrides/:gapId", async function (req) {
    const gapId = String(req.params.gapId || "").trim();
    if (!gapId) return { ok: false, error: "gapId required" };

    const body   = req.body && typeof req.body === "object" ? req.body : {};
    const status = Object.prototype.hasOwnProperty.call(body, "status")
      ? (body.status == null ? null : String(body.status)) : null;
    const owner  = Object.prototype.hasOwnProperty.call(body, "owner")
      ? (body.owner  == null ? null : String(body.owner))  : null;

    upsert.run({
      gap_id:     gapId,
      status,
      owner,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  });
};
