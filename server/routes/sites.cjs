"use strict";
const { createRequire } = require("module");
const path    = require("path");
const cr      = createRequire(__filename);
const Database = cr("better-sqlite3");
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
    CREATE TABLE IF NOT EXISTS site (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      city        TEXT NOT NULL DEFAULT '',
      country     TEXT NOT NULL DEFAULT 'SA',
      site_type   TEXT NOT NULL DEFAULT 'OUTDOOR',
      status      TEXT NOT NULL DEFAULT 'ACTIVE',
      gps_lat     REAL,
      gps_lng     REAL,
      notes       TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      created_by  TEXT,
      updated_by  TEXT
    );
  `);
}

const VALID_TYPES   = ["OUTDOOR","INDOOR","BEACH","URBAN","DESERT","STADIUM"];
const VALID_STATUS  = ["ACTIVE","INACTIVE","RESTRICTED"];

module.exports = async function sitesRoutes(fastify) {
  const db = openDb();
  migrate(db);

  // GET /api/sites
  fastify.get("/api/sites", async () => {
    const items = db.prepare(
      "SELECT * FROM site ORDER BY created_at DESC"
    ).all();
    return { ok: true, items };
  });

  // GET /api/sites/:id
  fastify.get("/api/sites/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM site WHERE id = ?").get(req.params.id);
    if (!row) { reply.code(404); return { ok: false, error: "Not found" }; }
    return { ok: true, site: row };
  });

  // POST /api/sites
  fastify.post("/api/sites", async (req, reply) => {
    const { name, city = "", country = "SA", site_type = "OUTDOOR",
            status = "ACTIVE", gps_lat, gps_lng, notes,
            created_by } = req.body ?? {};

    if (!name?.trim()) {
      reply.code(400); return { ok: false, error: "name is required" };
    }
    if (!VALID_TYPES.includes(site_type)) {
      reply.code(400); return { ok: false, error: "Invalid site_type" };
    }
    if (!VALID_STATUS.includes(status)) {
      reply.code(400); return { ok: false, error: "Invalid status" };
    }

    const now = new Date().toISOString();
    const id  = randomUUID();
    db.prepare(`
      INSERT INTO site
        (id,name,city,country,site_type,status,gps_lat,gps_lng,notes,
         created_at,updated_at,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id, name.trim(), city.trim(), country.trim(), site_type, status,
           gps_lat ?? null, gps_lng ?? null, notes?.trim() ?? null,
           now, now, created_by ?? null, created_by ?? null);

    reply.code(201);
    return { ok: true, site: db.prepare("SELECT * FROM site WHERE id=?").get(id) };
  });

  // PATCH /api/sites/:id
  fastify.patch("/api/sites/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM site WHERE id=?").get(req.params.id);
    if (!row) { reply.code(404); return { ok: false, error: "Not found" }; }

    const { name, city, country, site_type, status,
            gps_lat, gps_lng, notes, updated_by } = req.body ?? {};

    if (site_type !== undefined && !VALID_TYPES.includes(site_type)) {
      reply.code(400); return { ok: false, error: "Invalid site_type" };
    }
    if (status !== undefined && !VALID_STATUS.includes(status)) {
      reply.code(400); return { ok: false, error: "Invalid status" };
    }

    const merged = {
      name:      name      !== undefined ? name.trim()        : row.name,
      city:      city      !== undefined ? city.trim()        : row.city,
      country:   country   !== undefined ? country.trim()     : row.country,
      site_type: site_type !== undefined ? site_type          : row.site_type,
      status:    status    !== undefined ? status             : row.status,
      gps_lat:   gps_lat   !== undefined ? gps_lat            : row.gps_lat,
      gps_lng:   gps_lng   !== undefined ? gps_lng            : row.gps_lng,
      notes:     notes     !== undefined ? (notes?.trim()||null): row.notes,
      updated_by: updated_by ?? row.updated_by,
      updated_at: new Date().toISOString(),
    };

    db.prepare(`
      UPDATE site SET name=?,city=?,country=?,site_type=?,status=?,
        gps_lat=?,gps_lng=?,notes=?,updated_by=?,updated_at=?
      WHERE id=?
    `).run(merged.name, merged.city, merged.country, merged.site_type,
           merged.status, merged.gps_lat, merged.gps_lng, merged.notes,
           merged.updated_by, merged.updated_at, req.params.id);

    return { ok: true, site: db.prepare("SELECT * FROM site WHERE id=?").get(req.params.id) };
  });

  // DELETE /api/sites/:id
  fastify.delete("/api/sites/:id", async (req, reply) => {
    const row = db.prepare("SELECT * FROM site WHERE id=?").get(req.params.id);
    if (!row) { reply.code(404); return { ok: false, error: "Not found" }; }
    db.prepare("DELETE FROM site WHERE id=?").run(req.params.id);
    return { ok: true };
  });
};
