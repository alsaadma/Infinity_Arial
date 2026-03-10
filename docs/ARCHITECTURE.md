# Architecture & Roadmap (Core)

## Product intent
The system supports operational planning for drone shows by combining:
- Asset reality (fleet + batteries as serialized assets)
- Event/show demand (required drones, assignments, timelines)
- Regulatory readiness (permit pipeline and site readiness)
- Computed operational readiness (capacity + constraints)
- Financial impacts (costing, depreciation, utilization)
- Analytics (KPIs across modules)

## Core modules (agreed priority order)
1. Identity & Roles (Users, RBAC, audit fields)
2. Asset Registry (Drones, Batteries as serialized assets)
3. Show/Event Engine (Shows + asset assignment/usage tracking)
4. Permit & Site Lifecycle Module (Permit pipeline, readiness impact)
5. Operational Readiness Engine (computed from fleet + permits + team)
6. Costing & Depreciation Module (asset cycles, degradation, financial impact)
7. Utilization & Capacity Planning Module
8. Reporting & Analytics Layer (cross-module KPIs)

## Current phase
Transitioning from:
- Level 2: local persistence / snapshot-based (frontend)
to:
- Level 3: local backend activation (Node + SQLite)

## Operating principles
- Prefer CQRS-lite: explicit read models for UI, isolated write paths.
- Small diffs; always keep build green.
- Keep module boundaries strict: add features only within the roadmap order.
