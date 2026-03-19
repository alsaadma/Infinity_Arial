"use strict";
/**
 * Shared auth middleware for Drones Calc
 *
 * requireAuth(req, reply)
 *   - Validates Bearer token, attaches req.dcUser = { userId, role, email }
 *   - Returns 401 if invalid/missing
 *
 * requirePermission(pageKey, needEdit)
 *   - Returns a Fastify preHandler function
 *   - Calls requireAuth first, then checks role_permission table
 *   - Returns 403 if role lacks access
 */
const path     = require("node:path");
const Database = require("better-sqlite3");
const { validateToken } = require("./tokenStore.cjs");

const DB_PATH = path.join(__dirname, "data", "drones_calc.sqlite");

// Cache permissions in memory (refreshed every 60s)
let _permCache = null;
let _permCacheAt = 0;
const CACHE_TTL = 60_000;

function loadPermissions() {
  const now = Date.now();
  if (_permCache && (now - _permCacheAt) < CACHE_TTL) return _permCache;

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const rows = db.prepare(
      "SELECT role, page_key, can_view, can_edit FROM role_permission"
    ).all();
    const map = {};
    for (const r of rows) {
      const key = r.role + ":" + r.page_key;
      map[key] = { canView: !!r.can_view, canEdit: !!r.can_edit };
    }
    _permCache = map;
    _permCacheAt = now;
    return map;
  } finally {
    try { db.close(); } catch {}
  }
}

/** Force-refresh permission cache (call after admin edits permissions) */
function invalidatePermCache() {
  _permCache = null;
  _permCacheAt = 0;
}

/**
 * Validates Bearer token and attaches req.dcUser.
 * Use as preHandler: { preHandler: requireAuth }
 */
function requireAuth(req, reply, done) {
  const auth  = String(req.headers["authorization"] || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const sess  = validateToken(token);
  if (!sess) {
    reply.code(401).send({ ok: false, error: "Not authenticated" });
    return;
  }
  req.dcUser = { userId: sess.userId, role: sess.role, email: sess.email };
  if (done) done();
}

/**
 * Returns a preHandler that checks both auth AND page permission.
 * @param {string} pageKey  - matches role_permission.page_key
 * @param {boolean} needEdit - true for write operations (POST/PUT/PATCH/DELETE)
 */
function requirePermission(pageKey, needEdit) {
  return function permissionCheck(req, reply, done) {
    // First: authenticate
    const auth  = String(req.headers["authorization"] || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const sess  = validateToken(token);
    if (!sess) {
      reply.code(401).send({ ok: false, error: "Not authenticated" });
      return;
    }
    req.dcUser = { userId: sess.userId, role: sess.role, email: sess.email };

    // ADMIN bypasses permission checks
    if (sess.role === "ADMIN") {
      if (done) done();
      return;
    }

    // Check permission matrix
    const perms = loadPermissions();
    const key   = sess.role + ":" + pageKey;
    const entry = perms[key];

    if (!entry || !entry.canView) {
      reply.code(403).send({ ok: false, error: "Access denied: no access to " + pageKey });
      return;
    }
    if (needEdit && !entry.canEdit) {
      reply.code(403).send({ ok: false, error: "Access denied: read-only on " + pageKey });
      return;
    }
    if (done) done();
  };
}

module.exports = { requireAuth, requirePermission, invalidatePermCache, loadPermissions };
