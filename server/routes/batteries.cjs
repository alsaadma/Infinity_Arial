"use strict";
/**
 * Drones Calc - Module 2: Asset Registry (Batteries)
 * GET  is open   - read from anywhere
 * POST / PATCH / DELETE require a valid Bearer token
 */
const path     = require("node:path");
const crypto   = require("node:crypto");
const Database = require("better-sqlite3");
const { validateToken } = require("../tokenStore.cjs");

const DB_PATH      = path.join(__dirname, "..", "data", "drones_calc.sqlite");
const VALID_TYPES  = ["ON_DRONE", "TRAY", "STATION"];
const VALID_STATUS = ["ACTIVE", "DEGRADED", "RETIRED"];

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
    CREATE TABLE IF NOT EXISTS battery_unit (
      id               TEXT PRIMARY KEY,
      serial_number    TEXT NULL,
      battery_type     TEXT NOT NULL CHECK (battery_type IN ('ON_DRONE','TRAY','STATION')),
      drone_id         TEXT NULL REFERENCES drone_unit(id),
      cycle_count      INTEGER NOT NULL DEFAULT 0,
      cycle_max        INTEGER NOT NULL DEFAULT 300,
      health_pct       REAL    NOT NULL DEFAULT 100.0,
      status           TEXT NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE','DEGRADED','RETIRED')),
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_battery_unit_type   ON battery_unit(battery_type);
    CREATE INDEX IF NOT EXISTS idx_battery_unit_status ON battery_unit(status);
    CREATE INDEX IF NOT EXISTS idx_battery_unit_drone  ON battery_unit(drone_id);

    CREATE TABLE IF NOT EXISTS battery_status_log (
      id          TEXT PRIMARY KEY,
      battery_id  TEXT NOT NULL,
      from_status TEXT NULL,
      to_status   TEXT NOT NULL,
      reason      TEXT NULL,
      changed_by  TEXT NULL,
      changed_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_bsl_battery_id ON battery_status_log(battery_id);
  `);

  // Migration: add capacity_mah and voltage_nominal if not present
  const cols = db.prepare("SELECT name FROM pragma_table_info('battery_unit')").all().map(r => r.name);
  if (!cols.includes("capacity_mah"))
    db.exec("ALTER TABLE battery_unit ADD COLUMN capacity_mah INTEGER NULL");
  if (!cols.includes("voltage_nominal"))
    db.exec("ALTER TABLE battery_unit ADD COLUMN voltage_nominal REAL NULL");

  return db;
}

// RETIRED is terminal â€” no transitions out
function validateTransition(from, to) {
  if (from === to) return null;
  if (from === "RETIRED") return "RETIRED batteries cannot be transitioned to another status.";
  return null;
}

module.exports = async function batteriesRoutes(fastify) {
  const db = openDb();

  const selAll = db.prepare(`
    SELECT id, serial_number, battery_type, drone_id,
           cycle_count, cycle_max, health_pct, status,
           capacity_mah, voltage_nominal, purchase_price_sar, created_at, updated_at
    FROM battery_unit ORDER BY battery_type, created_at DESC
  `);
  const insert = db.prepare(`
    INSERT INTO battery_unit
      (id, serial_number, battery_type, drone_id, cycle_count, cycle_max,
       capacity_mah, voltage_nominal, purchase_price_sar)
    VALUES
      (@id, @serial_number, @battery_type, @drone_id, @cycle_count, @cycle_max,
       @capacity_mah, @voltage_nominal, @purchase_price_sar)
  `);
  const patchStatus = db.prepare(`
    UPDATE battery_unit
    SET status = @status, updated_at = datetime('now')
    WHERE id = @id
  `);
  const patchPrice = db.prepare(
    "UPDATE battery_unit SET purchase_price_sar = @price, updated_at = datetime('now') WHERE id = @id"
  );
  const insertLog = db.prepare(`
    INSERT INTO battery_status_log
      (id, battery_id, from_status, to_status, reason, changed_by)
    VALUES (@id, @battery_id, @from_status, @to_status, @reason, @changed_by)
  `);
  const selLog = db.prepare(`
    SELECT id, from_status, to_status, reason, changed_by, changed_at
    FROM battery_status_log WHERE battery_id = ?
    ORDER BY changed_at DESC LIMIT 50
  `);

  // â”€â”€ GET all â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get("/api/fleet/batteries", async function () {
    return { ok: true, items: selAll.all() };
  });

  // â”€â”€ POST create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.post("/api/fleet/batteries", { preHandler: requireAuth }, async function (req, reply) {
    const body    = req.body && typeof req.body === "object" ? req.body : {};
    const serial  = String(body.serial_number   || "").trim() || null;
    const type    = String(body.battery_type    || "").trim().toUpperCase();
    const drone   = String(body.drone_id        || "").trim() || null;
    const cycles  = Number.isInteger(body.cycle_count)    ? body.cycle_count    : 0;
    const maxC    = Number.isInteger(body.cycle_max)      ? body.cycle_max      : 300;
    const capMah  = body.capacity_mah != null             ? Number(body.capacity_mah)      : null;
    const voltage = body.voltage_nominal != null          ? Number(body.voltage_nominal)   : null;

    if (!VALID_TYPES.includes(type))
      return reply.code(400).send({ ok: false, error: "battery_type must be ON_DRONE|TRAY|STATION" });

    const priceRaw = (body.purchase_price_sar !== undefined && body.purchase_price_sar !== null && body.purchase_price_sar !== "")
      ? parseFloat(body.purchase_price_sar) : null;
    const purchase_price_sar = (priceRaw !== null && !isNaN(priceRaw) && priceRaw >= 0) ? priceRaw : null;
    const id = crypto.randomUUID();
    insert.run({ id, serial_number: serial, battery_type: type, drone_id: drone,
                 cycle_count: cycles, cycle_max: maxC,
                 capacity_mah: capMah, voltage_nominal: voltage, purchase_price_sar });
    return reply.code(201).send({ ok: true, id });
  });

  // -- PATCH drone assignment
  fastify.patch("/api/fleet/batteries/:id/drone", { preHandler: requireAuth }, async function (req, reply) {
    const id      = String(req.params.id || "").trim();
    const body    = req.body && typeof req.body === "object" ? req.body : {};
    const droneId = body.drone_id !== undefined
      ? (String(body.drone_id || "").trim() || null)
      : undefined;

    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    const existing = db.prepare("SELECT id FROM battery_unit WHERE id = ?").get(id);
    if (!existing) return reply.code(404).send({ ok: false, error: "battery not found" });

    // If assigning (not clearing), verify the drone exists
    if (droneId) {
      const drone = db.prepare("SELECT id FROM drone_unit WHERE id = ?").get(droneId);
      if (!drone) return reply.code(404).send({ ok: false, error: "drone not found" });
    }

    db.prepare("UPDATE battery_unit SET drone_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(droneId ?? null, id);
    return { ok: true, id, drone_id: droneId ?? null };
  });

  // -- PATCH price
  fastify.patch("/api/fleet/batteries/:id/price", { preHandler: requireAuth }, async function (req, reply) {
    const id       = String(req.params.id || "").trim();
    const body     = req.body && typeof req.body === "object" ? req.body : {};
    const priceRaw = body.purchase_price_sar;
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    const existing = db.prepare("SELECT id FROM battery_unit WHERE id = ?").get(id);
    if (!existing) return reply.code(404).send({ ok: false, error: "battery not found" });
    const price = (priceRaw !== undefined && priceRaw !== null && priceRaw !== "")
      ? parseFloat(priceRaw) : null;
    if (price !== null && (isNaN(price) || price < 0))
      return reply.code(400).send({ ok: false, error: "purchase_price_sar must be >= 0" });
    patchPrice.run({ id, price });
    return { ok: true, id, purchase_price_sar: price };
  });


  // â”€â”€ PATCH status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.patch("/api/fleet/batteries/:id/status", { preHandler: requireAuth }, async function (req, reply) {
    const id     = String(req.params.id  || "").trim();
    const body   = req.body && typeof req.body === "object" ? req.body : {};
    const status = String(body.status    || "").trim().toUpperCase();
    const reason = String(body.reason    || "").trim() || null;
    const by     = String(body.updated_by|| "").trim() || null;

    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    if (!VALID_STATUS.includes(status))
      return reply.code(400).send({ ok: false, error: "invalid status" });

    const existing = db.prepare("SELECT status FROM battery_unit WHERE id = ?").get(id);
    if (!existing) return reply.code(404).send({ ok: false, error: "battery not found" });

    const transErr = validateTransition(existing.status, status);
    if (transErr) return reply.code(422).send({ ok: false, error: transErr });

    const logId = crypto.randomUUID();
    db.transaction(() => {
      patchStatus.run({ id, status });
      insertLog.run({
        id: logId, battery_id: id,
        from_status: existing.status, to_status: status,
        reason, changed_by: by,
      });
    })();

    return { ok: true, from_status: existing.status, to_status: status };
  });

  // â”€â”€ GET log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.get("/api/fleet/batteries/:id/log", async function (req, reply) {
    const id = String(req.params.id || "").trim();
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    return { ok: true, items: selLog.all(id) };
  });

  // â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fastify.delete("/api/fleet/batteries/:id", { preHandler: requireAuth }, async function (req, reply) {
    const id = String(req.params.id || "").trim();
    if (!id) return reply.code(400).send({ ok: false, error: "id required" });
    const result = db.prepare("DELETE FROM battery_unit WHERE id = ?").run(id);
    if (result.changes === 0) return reply.code(404).send({ ok: false, error: "battery not found" });
    return { ok: true };
  });
};
