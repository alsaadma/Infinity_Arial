"use strict";
/**
 * Shared audit logger for Drones Calc
 *
 * logAudit(db, opts) - writes one row to audit_log
 *   opts: { userId, userEmail, action, module, recordId, oldValue, newValue, ip }
 *
 * Actions: INSERT, UPDATE, DELETE, LOGIN, LOGOUT, PASSWORD_CHANGE
 */

const _stmt = new WeakMap();

function getStmt(db) {
  if (_stmt.has(db)) return _stmt.get(db);
  const s = db.prepare(`
    INSERT INTO audit_log (user_id, user_email, action, module, record_id, old_value, new_value, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  _stmt.set(db, s);
  return s;
}

/**
 * @param {Database} db - an open better-sqlite3 instance
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.userEmail
 * @param {string} opts.action      - INSERT|UPDATE|DELETE|LOGIN|LOGOUT|PASSWORD_CHANGE
 * @param {string} opts.module      - page_key like "assets", "shows", "costing"
 * @param {string} [opts.recordId]  - the primary key of the affected record
 * @param {*}      [opts.oldValue]  - previous state (will be JSON.stringify'd if object)
 * @param {*}      [opts.newValue]  - new state (will be JSON.stringify'd if object)
 * @param {string} [opts.ip]        - request IP address
 */
function logAudit(db, opts) {
  try {
    const stmt = getStmt(db);
    stmt.run(
      opts.userId    || null,
      opts.userEmail || null,
      opts.action,
      opts.module,
      opts.recordId  || null,
      opts.oldValue  ? (typeof opts.oldValue === "object" ? JSON.stringify(opts.oldValue) : String(opts.oldValue)) : null,
      opts.newValue  ? (typeof opts.newValue === "object" ? JSON.stringify(opts.newValue) : String(opts.newValue)) : null,
      opts.ip        || null
    );
  } catch (e) {
    console.error("[audit] Failed to write audit log:", e.message);
  }
}

module.exports = { logAudit };
