# Frontend Folder Inventory

This inventory is the migration baseline for feature-first rollout.

## Route-only (keep under `app/**`)

- `app/(app)/porter/request/components/*`
- `app/(app)/porter/joblist/components/*`
- `app/(app)/porter/stat/components/*`
- `app/(app)/setting/*/page.tsx`
- `app/(app)/profile/page.tsx`

## Domain-shared (migrated to `features/**`)

- Porter shared UI: `features/porter/components/shared/*`
- Porter query keys: `features/porter/lib/queryKeys.ts`
- Setting reusable CRUD UI: `features/setting/components/*`
- Setting domain types: `features/setting/types.ts`
- Profile domain types: `features/profile/types.ts`

## Global shared (remain in root)

- `components/layout/*`, `components/providers/*`, `components/ui/*`
- `config/*`
- `styles/globals.css`
- `types/*` (cross-domain contracts)

## Cleanup candidates

- `components/icons.tsx` duplicates intent with `components/ui/icons.tsx` and is only used by one file.
- Legacy compatibility files under `app/(app)/*` now re-export feature modules and can be retired incrementally.
