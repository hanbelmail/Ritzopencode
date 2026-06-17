# Shared Library

## Purpose

- Owns shared providers, authentication context, Convex-backed reservation/settings store hooks, legacy localStorage migration helpers, calculations, query client setup, app params, not-found component, and utilities.

## Ownership

- `defaults.js` owns server-safe default settings, quote webhook defaults, and payment method constants shared by client hooks and API routes.
- `convex-server.js` owns server-side Convex HTTP client creation and JSON error helpers for App Router API routes.
- `r2.js` owns server-side Cloudflare R2 S3 client setup and signed URL helpers for private payment proof objects.
- `store.js` owns reservation tickets/settings client hooks, status constants, default/settings normalization, and legacy `ritz_*` localStorage migration keys.
- `StoreMigrator.jsx` owns one-time import of legacy browser-local reservation/settings data into Convex.
- `AuthContext.jsx` adapts Convex Auth state/actions to the app's existing `useAuth()` contract.
- `Providers.jsx` and `query-client.js` own app-wide client context providers outside Convex Auth.
- `calc.js` owns money formatting and reservation price/date calculations.
- `utils.js` owns shared utility helpers such as class-name composition.

## Local Contracts

- Treat Convex `tickets` and `settings` tables as the live persistence contract for reservation/settings data, including quote webhook URL/enabled settings.
- Treat legacy `ritz_*` localStorage keys as import-only compatibility contracts for existing browser data.
- Keep browser-only storage access guarded for server rendering where applicable.
- Keep R2 credentials server-only; client components must use API routes for signed payment proof upload/view URLs.
- Do not duplicate status, payment method, settings, or ticket schema constants in route or component files.

## Work Guidance

- When changing persisted settings shapes, include migration/default handling near `normalizeSettings()`.
- Keep calculation logic deterministic and independent from React components.
- Keep auth behavior consistent with staff route guards in `app/(staff)/AGENTS.md`.

## Verification

- Run `npm run build` after provider, auth, persistence, or calculation changes when feasible.

## Child DOX Index

- No child DOX files.
