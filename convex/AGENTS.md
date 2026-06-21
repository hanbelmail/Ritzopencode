# Convex Backend

## Purpose

- Owns Convex backend configuration, Convex Auth setup, HTTP auth routes, schema definitions, reservation/settings tables, and generated Convex backend functions.

## Ownership

- `auth.ts` owns Convex Auth provider configuration, including Resend-backed password reset email delivery.
- `auth.config.ts` owns Convex Auth client trust configuration.
- `http.ts` owns Convex HTTP routes, including auth endpoints.
- `schema.ts` owns Convex database schema tables, including Auth, `tickets`, and `settings`.
- `tickets.ts` owns reservation ticket queries, mutations, persisted status normalization, and legacy ticket import.
- `settings.ts` owns shared app settings query and mutation.
- `tsconfig.json` owns TypeScript settings for Convex backend files.

## Local Contracts

- Keep Convex backend files TypeScript, matching Convex conventions, while the Next.js app remains JavaScript/JSX unless explicitly changed.
- Include `authTables` in `schema.ts` for Convex Auth compatibility.
- Do not store Convex secrets in source files; use `npx convex env set` or the Convex dashboard.
- Password reset emails require Convex env values `AUTH_RESEND_KEY` for the Resend API key and `AUTH_RESEND_FROM` for the sender address, for example `Waikiki Secret <reservations@app.waikikisecret.xyz>`.

## Work Guidance

- Run `npx convex dev` to create/sync the deployment and generate Convex files when backend functions change.
- Keep `tickets.ts` and `settings.ts` aligned with client hooks in `lib/store.js`.

## Verification

- Use `npx convex dev` for backend sync/codegen when Convex functions or schema change.

## Child DOX Index

- No child DOX files.
