# Convex Backend

## Purpose

- Owns Convex backend configuration, Convex Auth setup, HTTP auth routes, schema definitions, reservation/settings/dashboard preference tables, and generated Convex backend functions.

## Ownership

- `auth.ts` owns Convex Auth provider configuration, including Resend-backed password reset email delivery.
- `auth.config.ts` owns Convex Auth client trust configuration.
- `http.ts` owns Convex HTTP routes, including auth endpoints.
- `schema.ts` owns Convex database schema tables, including Auth, tickets/settings/dashboard preferences, contacts, conversations, messages, Knowledge, immutable Terms, payment-upload receipts, phone-level SMS consent, reservation events, agent runs, SMS outbox, and webhook events.
- `tickets.ts` owns reservation ticket queries, public Terms/payment gates, confirmed proof-receipt consumption, paginated/filterable dashboard queries, export queries, mutations, persisted status normalization, lifecycle guest-SMS claim/confirm/finish fencing, searchable ticket index fields, index-field backfill, and legacy ticket import.
- `settings.ts` owns shared app settings query and mutation, including email alert settings stored in the main settings document.
- `dashboardPreferences.ts` owns per-authenticated-user dashboard preference reads and upserts keyed by Convex Auth user ID.
- `security.ts` owns staff and shared server-service authorization checks.
- `conversations.ts` owns durable web/SMS conversation state, transcripts, agent-run audit records, rate limits, staff inbox queries, human controls, and staff-only conversation cleanup.
- `knowledge.ts` and `knowledgeSeed.ts` own approved Knowledge retrieval, staff versioned edits, and the 42 draft starter entries.
- `sara.ts` owns one-unit availability, exact client matching, control-fenced quote creation, guest-safe ticket context, immutable Terms presentation/acceptance, payment-instruction authorization, handoff, and ordered SMS consent updates.
- `smsConsent.ts` owns canonical normalized-phone consent reads and explicit legacy STOP/START recovery.
- `messaging.ts` owns owned Quo webhook leases, SMS outbox idempotency, final consent/control/policy claims, send attempts, and delivery-state updates.
- `terms.ts` owns public immutable Terms-version reads.
- `tsconfig.json` owns TypeScript settings for Convex backend files.

## Local Contracts

- Keep Convex backend files TypeScript, matching Convex conventions, while the Next.js app remains JavaScript/JSX unless explicitly changed.
- Include `authTables` in `schema.ts` for Convex Auth compatibility.
- Keep `dashboardPreferences` scoped to the authenticated Convex Auth user; unauthenticated reads return `null` and unauthenticated saves fail.
- Do not store Convex secrets in source files; use `npx convex env set` or the Convex dashboard.
- Password reset emails require Convex env values `AUTH_RESEND_KEY` for the Resend API key and `AUTH_RESEND_FROM` for the sender address, for example `Waikiki Secret <reservations@app.waikikisecret.xyz>`.

## Work Guidance

- Run `npx convex dev` to create/sync the deployment and generate Convex files when backend functions change.
- Keep `tickets.ts` and `settings.ts` aligned with client hooks in `lib/store.js`.
- Keep `dashboardPreferences.ts` aligned with dashboard preference normalization and hooks in `lib/store.js`.
- Keep `tickets.ts` create/update/import paths syncing top-level ticket search/filter fields used by paginated dashboard queries.
- Keep anonymous ticket access limited to validated quote creation, opaque-ID ticket reads, finalized date ranges, exact current-Terms acceptance, and the confirmed-proof `PRICE SENT` to `PAYMENT SUBMITTED` transition; staff/service credentials own listing, exports, arbitrary updates, and deletion.
- `knowledge.searchApproved` must return only active, approved, guest-audience entries; drafts and archived entries must never reach Sara.
- All Sara service functions require `SARA_SERVICE_KEY`; OpenAI must receive no direct Convex credential or unrestricted ticket mutation.
- Mutating Sara operations and automated transcript writes must carry the active conversation control version so STOP, ticket changes, or staff takeover fence stale work.
- Staff-only conversation deletion cascades through messages, agent runs, and message outbox rows; it clears the deleted public conversation ID from the preserved ticket and preserves contacts, SMS consent, reservation events, and webhook records.
- Treat normalized-phone SMS consent as authoritative; queue checks are advisory and every paid SMS path must recheck consent and current policy immediately before provider delivery.
- Ticket lifecycle SMS claims are a closed event set for `PRICE SENT`, `PAYMENT SUBMITTED`, `PAYMENT VERIFIED`, and `BOOKING CONFIRMED`; final confirmation must reject ticket, phone, consent-version, settings, enablement, test-mode, or allowlist changes and successful completion stamps at most one provider acceptance per ticket/status.
- Finalizing a ticket as `PAYMENT VERIFIED` or `BOOKING CONFIRMED` must atomically reject overlapping one-unit stays while preserving same-day checkout/check-in turnover.

## Verification

- Use `npx convex dev` for backend sync/codegen when Convex functions or schema change.

## Child DOX Index

- No child DOX files.
