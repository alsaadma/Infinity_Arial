/**
 * Drones Calc — Module 1: Identity & Roles
 * Routes:
 *   GET   /api/users                  -> list all users
 *   POST  /api/users                  -> create user { name, email, role }
 *   PATCH /api/users/:id/password     -> change password { current_password, new_password }
 *                                        requires Bearer token
 */
"use strict";
const path     = require("node:path");
const crypto   = require("node:crypto");
const Database = require("better-sqlite3");
const { validateToken } = require("../tokenStore.cjs");

const DB_PATH = path.join(__dirname, "..", "data", "drones_calc.sqlite");

function hashPw(p) {
  return crypto.createHash("sha256").update(String(p)).digest("hex");
}

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
    CREATE TABLE IF NOT EXISTS app_user (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      role       TEXT NOT NULL CHECK (role IN ('ADMIN','OPS','FINANCE','VIEWER')),
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user(role);
  `);
  return db;
}

module.exports = async function usersRoutes(fastify) {
  const db = openDb();

  const selAll = db.prepare(
    "SELECT id, name, email, role, is_active, created_at, updated_at FROM app_user ORDER BY name"
  );
  const insert = db.prepare(`
    INSERT INTO app_user (id, name, email, role, is_active)
    VALUES (@id, @name, @email, @role, 1)
  `);
  const getById = db.prepare(
    "SELECT id, password_hash FROM app_user WHERE id = ?"
  );
  const updatePw = db.prepare(
    "UPDATE app_user SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
  );

  fastify.get("/api/users", async function () {
    return { ok: true, items: selAll.all() };
  });

  fastify.post("/api/users", async function (req, reply) {
    const body  = req.body && typeof req.body === "object" ? req.body : {};
    const name  = String(body.name  || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role  = String(body.role  || "").trim().toUpperCase();

    if (!name)  return reply.code(400).send({ ok: false, error: "name required" });
    if (!email) return reply.code(400).send({ ok: false, error: "email required" });
    if (!["ADMIN","OPS","FINANCE","VIEWER"].includes(role))
      return reply.code(400).send({ ok: false, error: "role must be ADMIN|OPS|FINANCE|VIEWER" });

    const id = crypto.randomUUID();
    try {
      insert.run({ id, name, email, role });
      return reply.code(201).send({ ok: true, id });
    } catch (e) {
      if (e.message.includes("UNIQUE")) return reply.code(409).send({ ok: false, error: "email already exists" });
      throw e;
    }
  });

  fastify.patch("/api/users/:id/password", { preHandler: requireAuth }, async function (req, reply) {
    const id   = String(req.params.id || "").trim();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const cur  = String(body.current_password || "").trim();
    const next = String(body.new_password     || "").trim();

    if (!id)   return reply.code(400).send({ ok: false, error: "id required" });
    if (!cur)  return reply.code(400).send({ ok: false, error: "current_password required" });
    if (!next) return reply.code(400).send({ ok: false, error: "new_password required" });
    if (next.length < 8)
      return reply.code(400).send({ ok: false, error: "new_password must be at least 8 characters" });

    const user = getById.get(id);
    if (!user) return reply.code(404).send({ ok: false, error: "user not found" });
    if (!user.password_hash || user.password_hash !== hashPw(cur))
      return reply.code(403).send({ ok: false, error: "current_password is incorrect" });

    updatePw.run(hashPw(next), id);
    return { ok: true };
  });
};
