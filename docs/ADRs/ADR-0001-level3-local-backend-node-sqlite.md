# ADR-0001: Level 3 local backend using Node + SQLite

## Status
Proposed

## Context
The project is transitioning from Level 2 local persistence (frontend snapshot-based) to a Level 3 architecture.
Level 2 is useful for rapid iteration but creates fragmentation (UI logic/persistence hacks) and weakens integrity.

## Decision
Adopt a local backend (Node) with SQLite as the persistence layer for Level 3.

## Consequences
- Improves durability and prepares the system for multi-user / RBAC evolution.
- Enables stronger separation of read models vs write paths.
- Requires API boundaries and migration strategy from Level 2 state.

## Alternatives considered
- Continue Level 2 only (fast but accumulates hacks and inconsistency).
- IndexedDB-first persistence (possible, but still UI-centric and harder to govern).
