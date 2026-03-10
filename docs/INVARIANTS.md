# Invariants (Non-negotiables)

These are rules changes must not violate.

## Build & integrity
- Main branch should remain build-clean (TypeScript + Vite build).
- Prefer small, bounded changes (touch few files per change).

## Domain & module boundaries
- Do not introduce new major modules outside the 8-module roadmap.
- If implementing a feature, align it to an existing module and document it in ARCHITECTURE.md.

## Data responsibilities
- UI should render read models and avoid embedding complex business rules inline.
- Business computations should be centralized (engine/read-model layer), not duplicated across panels.

## Persistence evolution
- Level 2 is transitional: avoid over-investing in localStorage hacks that will be replaced by Level 3.
- Any new persistence should be designed with Level 3 (Node + SQLite) in mind.

## Observability
- Any critical calculation should expose: inputs, outputs, and failure mode (safe fallback).
