"use strict";
/**
 * Drones Calc - In-memory session token store
 * Shared by auth.cjs and route preHandlers.
 * All tokens clear on server restart (intentional).
 */
const crypto = require("node:crypto");

const _store = new Map();
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function createToken(userId, role, email) {
  const token = crypto.randomBytes(32).toString("hex");
  _store.set(token, { userId, role, email, expiresAt: Date.now() + TTL_MS });
  return token;
}

function validateToken(rawToken) {
  if (!rawToken) return null;
  const entry = _store.get(rawToken);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _store.delete(rawToken); return null; }
  return entry;
}

function revokeToken(rawToken) {
  _store.delete(rawToken);
}

module.exports = { createToken, validateToken, revokeToken };
