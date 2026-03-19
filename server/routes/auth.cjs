"use strict";
/**
 * Drones Calc - Authentication Routes
 *   POST /api/auth/login   { email, password } -> { ok, token, role, email, name }
 *   POST /api/auth/logout                      -> { ok }
 *   GET  /api/auth/me                          -> { ok, userId, role, email }
 *
 * On first run: seeds admin@infinity.local / Admin@1234 if no ADMIN with password exists.
 */
const path     = require("node:path");
const crypto   = require("node:crypto");
const Database = require("better-sqlite3");
const { createToken, validateToken, revokeToken } = require("../tokenStore.cjs");
const { logAudit } = require("../auditLog.cjs");

const DB_PATH = path.join(__dirname, "..", "data", "drones_calc.sqlite");

function hashPw(p) {
  return crypto.createHash("sha256").update(String(p)).digest("hex");
}

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  const cols = db.prepare("PRAGMA table_info(app_user)").all().map((c) => c.name);
  if (!cols.includes("password_hash")) {
    db.exec("ALTER TABLE app_user ADD COLUMN password_hash TEXT NULL;");
    console.log("[auth] Added password_hash column to app_user");
  }
  return db;
}

function seedDefaultAdmin(db) {
  const existing = db.prepare(
    "SELECT id FROM app_user WHERE role = 'ADMIN' AND password_hash IS NOT NULL LIMIT 1"
  ).get();
  if (existing) return;

  const nopass = db.prepare(
    "SELECT id FROM app_user WHERE email = 'admin@infinity.local'"
  ).get();
  if (nopass) {
    db.prepare(
      "UPDATE app_user SET password_hash = ? WHERE email = 'admin@infinity.local'"
    ).run(hashPw("Admin@1234"));
  } else {
    db.prepare(`
      INSERT INTO app_user (id, name, email, role, is_active, password_hash)
      VALUES (?, 'System Admin', 'admin@infinity.local', 'ADMIN', 1, ?)
    `).run(crypto.randomUUID(), hashPw("Admin@1234"));
  }
  console.log("[auth] Default admin ready -> admin@infinity.local / Admin@1234");
}

module.exports = async function authRoutes(fastify) {
  const db = openDb();
  seedDefaultAdmin(db);

  fastify.post("/api/auth/login", async function (req, reply) {
    const body     = req.body && typeof req.body === "object" ? req.body : {};
    const email    = String(body.email    || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password)
      return reply.code(400).send({ ok: false, error: "email and password required" });

    const user = db.prepare(
      "SELECT id, name, email, role, is_active, password_hash FROM app_user WHERE email = ?"
    ).get(email);

    if (!user || !user.is_active || !user.password_hash || user.password_hash !== hashPw(password))
      return reply.code(401).send({ ok: false, error: "Invalid credentials" });

    const token = createToken(user.id, user.role, user.email);

    // Update last_login timestamp
    try { db.prepare("UPDATE app_user SET updated_at = datetime('now') WHERE id = ?").run(user.id); } catch {}

    logAudit(db, {
      userId: user.id, userEmail: user.email, action: "LOGIN",
      module: "auth", ip: req.ip
    });

    return { ok: true, token, role: user.role, email: user.email, name: user.name };
  });

  fastify.post("/api/auth/logout", async function (req) {
    const auth  = String(req.headers["authorization"] || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const sess = validateToken(token);
    revokeToken(token);

    if (sess) {
      logAudit(db, {
        userId: sess.userId, userEmail: sess.email, action: "LOGOUT",
        module: "auth", ip: req.ip
      });
    }

    return { ok: true };
  });

  
  fastify.get("/api/auth/permissions", async function (req, reply) {
    const auth  = String(req.headers["authorization"] || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const sess  = validateToken(token);
    if (!sess) return reply.code(401).send({ ok: false, error: "Not authenticated" });
    const perms = db.prepare(
      "SELECT page_key, can_view, can_edit FROM role_permission WHERE role = ? ORDER BY page_key"
    ).all(sess.role);
    const items = perms.map(p => ({
      page_key: p.page_key,
      can_view: !!p.can_view,
      can_edit: !!p.can_edit,
    }));
    return { ok: true, items };
  });

  fastify.get("/api/auth/me", async function (req, reply) {
    const auth  = String(req.headers["authorization"] || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const sess  = validateToken(token);
    if (!sess) return reply.code(401).send({ ok: false, error: "Not authenticated" });
    return { ok: true, userId: sess.userId, role: sess.role, email: sess.email };
  });
};
