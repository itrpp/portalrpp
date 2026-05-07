# Frontend Feature Modules

This directory contains domain-level modules for code shared by multiple routes in the same business area.

## Placement Rules

- Keep route-local UI in `app/**` (only used by one route segment).
- Move domain-shared code to `features/<domain>/**`.
- Keep global shared code in root folders (`components`, `hooks`, `lib`, `types`).
- Keep server-only utilities in `lib/server/**` and never import them in client components.

## Current Domains

- `features/porter`
- `features/setting`
- `features/profile`
- `features/auth` (reserved)

## Public Entry Pattern

Each domain should expose stable imports via `features/<domain>/index.ts` where appropriate.
