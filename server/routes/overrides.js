/**
 * Drones Calc Level 3 (local backend) — Overrides API
 * - SQLite-backed gap overrides (status/owner)
 * - Fastify plugin (CommonJS)
 *
 * Routes:
 *   GET  /api/overrides           -> { items: [{ gapId, status, owner, updatedAt }] }
 *   PUT  /api/overrides/:gapId    -> upsert body { status?, owner? } -> { ok: true }
 */
const path = require("node:path");
const Database = require("better-sqlite3");

function openDb() {
  const dbFile = path.join(__dirname, "..", "data", "dc.sqlite");
  const db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.exec(\
    CREATE TABLE IF NOT EXISTS gap_override (
      gap_id TEXT PRIMARY KEY,
      status TEXT NULL,
      owner  TEXT NULL,
      updated_at TEXT NOT NULL
    );
  \);
  return db;
}

module.exports = async function overridesRoutes(fastify) {
  const db = openDb();

  const selAll = db.prepare("SELECT gap_id, status, owner, updated_at FROM gap_override ORDER BY gap_id");
  const upsert = db.prepare(\
    INSERT INTO gap_override (gap_id, status, owner, updated_at)
    VALUES (@gap_id, @status, @owner, @updated_at)
    ON CONFLICT(gap_id) DO UPDATE SET
      status = excluded.status,
      owner = excluded.owner,
      updated_at = excluded.updated_at
  \);

  fastify.get("/api/overrides", async function () {
    const rows = selAll.all();
    return {
      items: rows.map((r) => ({
        gapId: r.gap_id,
        status: r.status ?? null,
        owner: r.owner ?? null,
        updatedAt: r.updated_at,
      })),
    };
  });

  fastify.put("/api/overrides/:gapId", async function (req) {
    const gapId = String(req.params.gapId || "").trim();
    if (!gapId) return fastify.httpErrors ? fastify.httpErrors.badRequest("gapId required") : { ok: false, error: "gapId required" };

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const status = Object.prototype.hasOwnProperty.call(body, "status") ? (body.status == null ? null : String(body.status)) : null;
    const owner  = Object.prototype.hasOwnProperty.call(body, "owner")  ? (body.owner  == null ? null : String(body.owner))  : null;

    upsert.run({
      gap_id: gapId,
      status,
      owner,
      updated_at: new Date().toISOString(),
    });

    return { ok: true };
  });
};
