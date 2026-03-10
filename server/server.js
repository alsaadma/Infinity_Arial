/**
 * Drones Calc - Local Backend (Level 3)
 * Fastify + SQLite (better-sqlite3)
 */
import { createRequire } from "node:module";
import path              from "node:path";
import fs                from "node:fs";
import { fileURLToPath } from "node:url";
import Fastify           from "fastify";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const require    = createRequire(import.meta.url);

const Database        = require("better-sqlite3");
const overridesRoutes = require("./routes/overrides.cjs");
const usersRoutes     = require("./routes/users.cjs");
const dronesRoutes    = require("./routes/drones.cjs");
const batteriesRoutes = require("./routes/batteries.cjs");
const showsRoutes     = require("./routes/shows.cjs");
const permitsRoutes   = require("./routes/permits.cjs");
const authRoutes      = require("./routes/auth.cjs");

const app     = Fastify({ logger: false });
const DB_PATH = path.join(__dirname, "data", "drones_calc.sqlite");

function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  return db;
}

function getDroneStatusCounts(db) {
  const rows = db.prepare(
    "SELECT status, COUNT(*) AS c FROM drone_unit GROUP BY status"
  ).all();
  const out = { ACTIVE: 0, MAINTENANCE: 0, QUARANTINED: 0, RETIRED: 0 };
  for (const r of rows) {
    if (out[r.status] !== undefined) out[r.status] = Number(r.c) || 0;
  }
  return out;
}

app.get("/health", async () => ({ ok: true }));

app.get("/api/fleet/drones/summary", async () => {
  const db = openDb();
  try {
    const c     = getDroneStatusCounts(db);
    const total = c.ACTIVE + c.MAINTENANCE + c.QUARANTINED + c.RETIRED;
    return {
      ok: true,
      db_path: DB_PATH,
      counts: { total, active: c.ACTIVE, maintenance: c.MAINTENANCE,
                quarantined: c.QUARANTINED, retired: c.RETIRED },
      available_for_planning: c.ACTIVE,
    };
  } finally {
    try { db.close(); } catch {}
  }
});

async function selfTest() {
  const addr = await app.listen({ host: "127.0.0.1", port: 0 });
  await app.close();
  return addr;
}

async function main() {
  if (process.env.DC_SERVER_TEST === "1") {
    const addr = await selfTest();
    console.log("[DC_SERVER_TEST] OK:", addr);
    return;
  }
  const port = Number(process.env.PORT || 3000);
  const host = String(process.env.HOST || "127.0.0.1");

  app.register(overridesRoutes);
  app.register(usersRoutes);
  app.register(dronesRoutes);
  app.register(batteriesRoutes);
  app.register(showsRoutes);
  app.register(permitsRoutes);
  app.register(authRoutes);

  await app.listen({ host, port });
  console.log(`DC backend listening on http://${host}:${port}`);
}

main().catch((err) => {
  console.error("DC backend failed to start:", err);
  process.exit(1);
});
