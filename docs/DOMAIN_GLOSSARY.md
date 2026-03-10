# Domain Glossary

## Core nouns
- **Asset**: A serialized entity tracked over time (e.g., Drone, Battery).
- **Drone**: A serialized flight unit (fleet item).
- **Battery**: A serialized power unit with cycle count / degradation attributes.
- **Show / Event**: A scheduled performance requiring an assigned fleet and readiness.
- **Permit**: Regulatory approval object tied to a site/event with lifecycle states.
- **Site**: Physical location for an event; may impose constraints and readiness requirements.

## Planning terms
- **Assignment**: Allocation of specific assets to a show/event window.
- **Utilization**: Time-based/assignment-based measure of asset usage and capacity.
- **Capacity**: Available assets and their ability to satisfy demand within constraints.

## Readiness
- **Operational Readiness**: Computed state derived from fleet + permits + team constraints.
- **Gap**: A shortfall or blocking issue (capacity gap, permit gap, readiness gap).
- **Action Plan**: Prioritized remediation steps derived from detected gaps.

## Data patterns
- **Read Model**: UI-friendly derived view (CQRS-lite) used for rendering decisions.
- **Write Path**: Controlled mutation path used to persist state changes.
