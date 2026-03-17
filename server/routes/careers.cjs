"use strict";
/**
 * Drones Calc - Careers/Applicant Routes (Admin-only)
 *   GET    /api/careers              -> list all applicants
 *   GET    /api/careers/:id          -> get single applicant
 *   POST   /api/careers              -> create applicant (from Google Form webhook or manual)
 *   PATCH  /api/careers/:id          -> update applicant (status, notes, training)
 *   DELETE /api/careers/:id          -> delete applicant
 */
const path = require("node:path");
const crypto = require("node:crypto");
const Database = require("better-sqlite3");
const { validateToken } = require("../tokenStore.cjs");

const DB_PATH = path.join(__dirname, "..", "data", "drones_calc.sqlite");

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

// Auth helper - checks for valid admin token
function requireAdmin(request, reply) {
  const authHeader = request.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    reply.code(401).send({ ok: false, error: "No token provided" });
    return null;
  }
  const payload = validateToken(token);
  if (!payload) {
    reply.code(401).send({ ok: false, error: "Invalid or expired token" });
    return null;
  }
  if (payload.role !== "ADMIN") {
    reply.code(403).send({ ok: false, error: "Admin access required" });
    return null;
  }
  return payload;
}

async function careersRoutes(app) {
  // GET /api/careers - List all applicants
  app.get("/api/careers", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const db = openDb();
    try {
      const rows = db.prepare(`
        SELECT * FROM applicant ORDER BY created_at DESC
      `).all();
      return { ok: true, applicants: rows };
    } finally {
      db.close();
    }
  });

  // GET /api/careers/:id - Get single applicant
  app.get("/api/careers/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const db = openDb();
    try {
      const row = db.prepare("SELECT * FROM applicant WHERE id = ?").get(request.params.id);
      if (!row) {
        return reply.code(404).send({ ok: false, error: "Applicant not found" });
      }
      return { ok: true, applicant: row };
    } finally {
      db.close();
    }
  });

  // POST /api/careers - Create applicant
  app.post("/api/careers", async (request, reply) => {
    // Note: This endpoint can be called without auth (for public form submissions)
    // or with auth (for manual admin entry)
    const db = openDb();
    try {
      const b = request.body || {};
      const id = crypto.randomUUID();
      
      // Calculate training_required based on key competencies
      let trainingRequired = 0;
      try {
        const regulatory = JSON.parse(b.comp_regulatory || "{}");
        // If missing GACA license, mark for training
        if (regulatory.reg_gaca_pilot === "no") trainingRequired = 1;
      } catch {}
      
      db.prepare(`
        INSERT INTO applicant (
          id, full_name, email, phone, city, nationality,
          positions, availability,
          comp_technical, comp_regulatory, comp_physical, comp_experience, comp_english,
          training_required, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')
      `).run(
        id,
        b.full_name || "",
        b.email || "",
        b.phone || null,
        b.city || null,
        b.nationality || null,
        b.positions || null,
        b.availability || null,
        b.comp_technical || null,
        b.comp_regulatory || null,
        b.comp_physical || null,
        b.comp_experience || null,
        b.comp_english || null,
        trainingRequired
      );
      
      return { ok: true, id };
    } finally {
      db.close();
    }
  });

  // PATCH /api/careers/:id - Update applicant
  app.patch("/api/careers/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const db = openDb();
    try {
      const b = request.body || {};
      const existing = db.prepare("SELECT id FROM applicant WHERE id = ?").get(request.params.id);
      if (!existing) {
        return reply.code(404).send({ ok: false, error: "Applicant not found" });
      }
      
      // Build dynamic update
      const updates = [];
      const values = [];
      
      if (b.status !== undefined) { updates.push("status = ?"); values.push(b.status); }
      if (b.notes !== undefined) { updates.push("notes = ?"); values.push(b.notes); }
      if (b.training_required !== undefined) { updates.push("training_required = ?"); values.push(b.training_required ? 1 : 0); }
      if (b.training_notes !== undefined) { updates.push("training_notes = ?"); values.push(b.training_notes); }
      
      if (updates.length === 0) {
        return { ok: true, message: "No changes" };
      }
      
      updates.push("updated_at = datetime('now')");
      values.push(request.params.id);
      
      db.prepare(`UPDATE applicant SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      
      return { ok: true };
    } finally {
      db.close();
    }
  });

  // DELETE /api/careers/:id - Delete applicant
  app.delete("/api/careers/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const db = openDb();
    try {
      const result = db.prepare("DELETE FROM applicant WHERE id = ?").run(request.params.id);
      if (result.changes === 0) {
        return reply.code(404).send({ ok: false, error: "Applicant not found" });
      }
      return { ok: true };
    } finally {
      db.close();
    }
  });
}

module.exports = careersRoutes;
