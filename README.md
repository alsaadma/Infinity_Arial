# Drones Calc / CommandOps

## Purpose
Drones Calc is an operational planning and readiness platform for a drone light-show business.
It helps track assets, shows/events, permits, readiness, costs, utilization, and reporting.

## Architecture (high-level)
- UI (React/Vite) renders read models for operational decision-making.
- Domain modules evolve in a defined order (see docs/ARCHITECTURE.md).
- Current evolution track: Level 2 local persistence → Level 3 local backend (Node + SQLite).

## Where to look
- docs/ARCHITECTURE.md — module roadmap + priority order
- docs/INVARIANTS.md — rules that changes must not break
- docs/DOMAIN_GLOSSARY.md — consistent definitions of key domain terms
- docs/ADRs/ — architectural decision records

## Development
Typical checks:
- npm run build

> Note: This repo uses a "guardrail first" approach. Prefer small, bounded changes with build checks.
