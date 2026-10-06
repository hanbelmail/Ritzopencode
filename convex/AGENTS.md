# Convex Backend

## Purpose

- Owns Convex backend configuration, Convex Auth setup, HTTP auth routes, schema definitions, reservation/settings/dashboard preference tables, and generated Convex backend functions.

## Ownership

- `auth.ts` owns Convex Auth provider configuration, including Resend-backed password reset email delivery.
- `auth.config.ts` owns Convex Auth client trust configuration.
- `http.ts` owns Convex HTTP routes, including auth endpoints.
- `schema.ts` owns Convex database schema tables, including Auth, tickets/settings/dashboard preferences, contacts, conversations, messages, Knowledge, immutable Terms, payment-upload receipts, phone-level SMS consent, reservation events, quote-webhook deliveries, agent runs, SMS outbox, webhook events, and ticket lifecycle SMS provider receipts.
- `tickets.ts` owns reservation ticket queries, public Terms/payment gates, confirmed proof-receipt consumption, paginated/filterable dashboard queries, export queries, mutations, persisted status normalization, quote-round minting, stale pricing-callback rejection, staff/automation re-quote rounds, lifecycle guest-SMS claim/confirm/finish fencing, lifecycle guest-SMS provider-receipt recording and delivery-receipt application, searchable ticket index fields, index-field backfill, and legacy ticket import.
- `ticketConfirmation.ts` owns the booking-confirmation sequencing invariant and confirmation-number patch normalization.
- `settings.ts` owns shared app settings query and mutation, including the global desktop table Columns-button visibility and email alert settings stored in the main settings document.
- `dashboardPreferences.ts` owns per-authenticated-user dashboard preference reads and upserts keyed by Convex Auth user ID.
- `security.ts` owns staff and shared server-service authorization checks.
- `conversations.ts` owns durable web/SMS conversation state, including provider-confirmed first-SMS disclosure completion, transcripts, agent-run audit records, rate limits, staff inbox queries, human controls, staff-only conversation cleanup, and the service-key-only `getServiceContext` read that deterministic server notifications use for web conversations because guest-hash-scoped `getContext` rejects server callers without the guest session.
- `knowledge.ts` and `knowledgeSeed.ts` own approved Knowledge retrieval, staff versioned edits, and synchronization of the 42 draft starter entries.
- `sara.ts` and `saraAvailability.ts` own Sona's one-unit exact-stay and Hawaii calendar-month range availability, exact client matching, control-fenced quote creation, guest-reservation edits limited to `QUOTE REQUESTED` and `PRICE SENT` with confirmation-gated date changes, guest-safe ticket context, immutable Terms presentation/acceptance, payment-instruction authorization, quote-ready notification stamping, handoff, and ordered SMS consent updates.
- `quoteRevision.ts` owns quote-round mechanics: revision and token minting, revision-scoped webhook idempotency keys, quote-input change detection, the re-quote reset field set including quote errors and price-sent notification stamps, and stale pricing-callback detection.
- `reservationChange.ts` owns deterministic reservation-change reply normalization, confirmation/cancellation allowlists, changed-field labels, quote-invalidating detection, pending-change expiry, and the order-independent pending ticket-snapshot comparison.
- `termsContract.ts` owns the canonical versioned web agreement label, current explicit agree/accept SMS allowlist, deterministic case/whitespace/safe-trailing-punctuation normalization, presentation-bound prior/legacy classifiers, and acceptance-attempt classification.
- `smsConsent.ts` owns canonical normalized-phone consent reads and explicit legacy STOP/START recovery.
- `messaging.ts` owns owned Quo webhook leases with caller-bounded lease durations, SMS outbox idempotency, final consent/control/policy claims, send attempts, conversation delivery-state updates, and staff-authenticated Quo webhook-health reporting.
- `quoteWebhook.ts` owns idempotent revision-scoped quote-webhook enqueueing, superseding of open earlier rounds, authoritative persisted-ticket payloads, delivery leases, bounded retries, and response/error records.
- `terms.ts` owns public immutable Terms-version reads.
- `tsconfig.json` owns TypeScript settings for Convex backend files.

## Local Contracts

- Keep Convex backend files TypeScript, matching Convex conventions, while the Next.js app remains JavaScript/JSX unless explicitly changed.
- Convex returns persisted object values with alphabetically sorted keys, so never compare a stored object against an in-memory one with `JSON.stringify`; compare normalized fields instead.
- Include `authTables` in `schema.ts` for Convex Auth compatibility.
- Keep `dashboardPreferences` scoped to the authenticated Convex Auth user; unauthenticated reads return `null` and unauthenticated saves fail.
- Do not store Convex secrets in source files; use `npx convex env set` or the Convex dashboard.
- Password reset emails require Convex env values `AUTH_RESEND_KEY` for the Resend API key and `AUTH_RESEND_FROM` for the sender address, for example `Waikiki Secret <reservations@app.waikikisecret.xyz>`.

## Work Guidance

- Run `npx convex dev` to create/sync the deployment and generate Convex files when backend functions change.
- Keep `tickets.ts` and `settings.ts` aligned with client hooks in `lib/store.js`.
- Keep `dashboardPreferences.ts` aligned with dashboard preference normalization and hooks in `lib/store.js`.
- Keep `tickets.ts` create/update/import paths syncing top-level ticket search/filter fields used by paginated dashboard queries.
- Keep anonymous ticket access limited to validated quote creation, opaque-ID ticket reads, finalized date ranges, deterministic current-Terms acceptance, and the confirmed-proof `PRICE SENT` to `PAYMENT SUBMITTED` transition; staff/service credentials own listing, exports, arbitrary updates, and deletion.
- `knowledge.searchApproved` must return only active, approved, guest-audience entries; drafts and archived entries must never reach Sona.
- Starter Knowledge synchronization inserts missing entries, refreshes changed non-archived starter entries, preserves approval for Sona-only branding migrations, and returns other changed approved entries to draft for staff review; archived entries remain untouched. Known starter-entry reads normalize legacy Sara mentions to Sona until persisted rows are synchronized without rewriting unrelated custom Knowledge.
- All Sona service functions require `SARA_SERVICE_KEY`; OpenAI must receive no direct Convex credential or unrestricted ticket mutation.
- Sona reservation edits accept only guest names, email, phone, and both stay dates; they run the same validation as quote creation, refuse paid/confirmed/cancelled statuses and SMS-channel mobile-number changes, refuse identifier changes that resolve to a different client record, and never write pricing, status, Terms, payment, or confirmation fields.
- A date change on a `PRICE SENT` ticket is staged as one pending change with a ticket snapshot, cleared Terms presentation, and a deterministic guest confirmation; applying it re-runs validation, rejects a ticket whose normalized snapshot fields moved meanwhile, expires after 30 minutes, and must not bump the conversation control version while Sona's own run is in flight.
- Automation callbacks that set `PRICE SENT`, a retail price, or a quote error must echo the ticket's current `quoteToken`; a superseded callback is rejected as a stale quote, while stamp-only automation updates remain unfenced.
- A guest-safe `quoteError` recorded by automation survives only until the next quote round: every re-quote reset clears it, and any save that lands a ticket on `PRICE SENT` removes it so a priced ticket never reports a failed lookup.
- `sara.recordQuoteNotification` stamps one quote-ready or quote-failure notification per ticket and revision; it deliberately leaves the row-level `updatedAt` untouched because that value is the lifecycle SMS concurrency fence.
- Sona month availability returns contiguous half-open check-in/check-out ranges, clips the current month to today in Hawaii, excludes entirely past months, and never treats a result as a hold.
- Sona exact availability and quote creation accept only real Gregorian `YYYY-MM-DD` dates; date-shaped prefixes and impossible dates must fail validation.
- Sona Terms acceptance must validate the persisted inbound SMS or authenticated web action against the current presentation, version, full hash, active quote, and payment conflicts; current provider-accepted or delivered SMS presentations accept only the explicit whole-message agree/accept allowlist after case, whitespace, and trailing `.`, `,`, or `!` normalization, reject questioning, negative, ambiguous, and malformed replies, preserve prior/legacy presentation rules, and record server time, source, action, acceptance contract, and an idempotent reservation event without asking OpenAI to decide agreement; typed web text never accepts.
- Mutating Sona operations and automated transcript writes must carry the active conversation control version so STOP, ticket changes, or staff takeover fence stale work.
- Staff-only conversation deletion cascades through messages, agent runs, and message outbox rows; it clears the deleted public conversation ID from the preserved ticket and preserves contacts, SMS consent, reservation events, and webhook records.
- Treat normalized-phone SMS consent as authoritative; queue checks are advisory and every paid SMS path must recheck consent and current policy immediately before provider delivery.
- Ticket lifecycle SMS claims are a closed event set for `PRICE SENT`, `PAYMENT SUBMITTED`, `PAYMENT VERIFIED`, and `BOOKING CONFIRMED`; final confirmation must reject ticket, phone, consent-version, settings, enablement, test-mode, or allowlist changes and successful completion stamps at most one provider acceptance per ticket/status.
- Every accepted ticket lifecycle SMS must record its provider message ID in `ticketSmsReceipts`, indexed by provider message ID and by ticket, so a later delivery receipt resolves without scanning tickets; the record is written even when the finish claim token was superseded, because the provider accepted the message anyway.
- `tickets.applySmsDeliveryReceipt` updates only the receipt row and never patches the ticket document, so a late delivery receipt cannot move ticket `updatedAt` and silently break the in-flight lifecycle SMS claim fence.
- `messaging.claimWebhook` clamps caller lease durations to 15-600 seconds and defaults to the full inbound lease; callers pass a shorter lease for cheap work that must not hold provider retries.
- `messaging.listForStaff` is staff-authenticated and returns only webhook event IDs, types, statuses, attempts, notes, bounded error text, and timestamps; provider payloads and payload hashes never leave Convex.
- Guest payment submission and later paid/confirmed status synchronization must preserve the conversation's existing active Sona state; they must not resume an already paused conversation or override STOP, staff control, handoff, cancellation, or consent gates.
- Finalizing a ticket as `PAYMENT VERIFIED` or `BOOKING CONFIRMED` must atomically reject overlapping one-unit stays while preserving same-day checkout/check-in turnover.
- Creating a ticket as `BOOKING CONFIRMED` is prohibited. A transition to `BOOKING CONFIRMED` requires the same nonblank confirmation number to exist on the persisted ticket before the transition mutation; the transition must not submit that field, and confirmed tickets must not clear it. Legacy confirmed records without a number may add one as a repair.
- Operational creation of a `QUOTE REQUESTED` ticket through `tickets.create` or `sara.createQuoteRequest` must enqueue exactly one `quote-created:<ticketId>` delivery; legacy imports do not replay historical quote webhooks.
- Quote-input edits that leave a ticket at `QUOTE REQUESTED`, and `PRICE SENT` to `QUOTE REQUESTED` transitions, must apply the shared re-quote reset, bump `quoteRevision`, mint a new `quoteToken`, and enqueue exactly one `quote-requote:<ticketId>:<revision>` delivery; price-only edits, payment-blocking tickets, and superseded or already-priced deliveries never re-fire.

## Verification

- Use `npx convex dev` for backend sync/codegen when Convex functions or schema change.
- Use `npm test` for deterministic Sona branding, prompt identity, year/date resolution, Terms acceptance classification, calendar-month availability range checks, re-quote round mechanics, reservation-change reply classification, and pending-change ticket-snapshot comparison.

## Child DOX Index

- No child DOX files.
