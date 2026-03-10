# Drones Calc — Repo Brain

## Purpose (1 paragraph)
Drones Calc is an operational-readiness and planning tool for drone light-show operations.
It models fleet assets (drones, batteries), shows/events, permits/sites, and computes operational readiness and risk.
The product is evolving from Level 2 (local persistence) toward Level 3 (local backend: Node + SQLite).

## Core Modules (priority order)
1) Identity & Roles (Users, RBAC, audit fields)
2) Asset Registry (Drones, Batteries as serialized assets)
3) Show/Event Engine (Shows + asset assignment/usage tracking)
4) Permit & Site Lifecycle Module (permit pipeline, readiness impact)
5) Operational Readiness Engine (computed from fleet + permits + team)
6) Costing & Depreciation (asset cycles, degradation, financial impact)
7) Utilization & Capacity Planning
8) Reporting & Analytics

## Non-negotiables (guardrails)
- Deterministic backups for patch scripts and risky changes
- Build must stay green: npm run build
- Prefer small composable modules over monolithic pages
- Avoid patching “blind”; always anchor edits to file paths + ranges

## Current Phase
Command stabilized; frontend is still Level 2 snapshot/local overrides.
Next: structure-focused evolution (read model refinement + Level 3 backend activation).

## Conventions
- Scripts live in repo root or /scripts (one standard; decide and enforce)
- Scripts must create backups: *.bak_yyyyMMdd_HHmmss
- Keep docs updated when architecture shifts (ADR if needed)