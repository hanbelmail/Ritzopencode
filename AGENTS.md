# DOX framework

## Purpose

- Next.js 15 reservations app for Ritz-Carlton private room quotes, public ticket lookup, staff reservation management, Convex Auth-backed staff authentication, and the shared Sona AI concierge for public web chat and Quo SMS.
- Source is JavaScript/JSX with the App Router, Tailwind CSS, shadcn-style UI primitives, Convex backend files, Convex Auth, and Convex-backed reservation/settings persistence.
- Generated outputs and installed dependencies are present in the workspace but are not source-of-truth work areas.

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it
- Keep durable source changes in `app/`, `components/`, `lib/`, `convex/`, `hooks/`, root config files, or `public/` if assets are added.
- Do not edit `.next/`, `.next-build/`, `.next-verify/`, or `node_modules/` as source; regenerate them through the relevant toolchain when needed.

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

- The dashboard table `Columns` button must always be hidden on mobile; the global Settings page controls whether it appears on desktop, while selected table columns remain per-staff dashboard preferences.
- After current Terms acceptance, Sona must immediately send authorized payment instructions on web and SMS; guests may request the instructions again later, and repeat delivery is allowed.
- SMS Terms acceptance must allow explicit whole-message agree/accept phrases, ignore capitalization, surrounding whitespace, and trailing periods, commas, or exclamation marks, and reject ambiguous, negative, questioning, or malformed replies; web acceptance remains checkbox/button only.
- Payment submission and later paid/confirmed ticket statuses must preserve an active Sona conversation; only STOP, explicit staff control or reply, handoff, cancellation, or another existing safety gate may pause it.
- Sona is the guest- and staff-visible concierge name. Web chat must display the approved exact Sona/Mike/private-condo opening message before guest input; the first SMS reply must disclose the same identity and independent-service status while acting on dates already provided. Keep compatibility-sensitive internal `sara*` routes, files, settings, environment variables, cookies, source tags, and function names unchanged.
- Staff and automation must save a nonblank reservation confirmation number in a separate successful mutation before changing a ticket to `BOOKING CONFIRMED`; confirmed tickets must retain a confirmation number, while legacy confirmed records without one remain repairable by adding it.
- Sona may edit an existing reservation only while it is `QUOTE REQUESTED` or `PRICE SENT`: stay dates, guest names, email, and phone on web (never the mobile number of an SMS conversation). A date change on a priced ticket requires one deterministic guest confirmation, retires the current price and recorded Terms acceptance, and starts an automatic re-quote round; Sona must never state, estimate, or promise the new price. Paid, submitted, confirmed, or cancelled reservations must hand off to staff.

## Work Guidance

- Use `@/` imports for project paths, matching `jsconfig.json`.
- Preserve the current JavaScript/JSX file style; do not introduce TypeScript unless explicitly requested.
- Treat `lib/store.js` constants and Convex tables as reservation/settings data contracts, including the public home page variant, versioned Terms acceptance, confirmed payment-upload receipts, durable quote-webhook deliveries, email/SMS alert settings, per-status guest SMS templates and delivery stamps, and R2 object-key fields such as `paymentScreenshotKey` and `retailPriceScreenshotKey`; legacy `ritz_*` localStorage keys are read only for one-time browser data migration.
- Keep public guest flows, staff-authenticated flows, reusable components, and storage/business logic separated by their owning child DOX files.
- `middleware.js` protects staff routes, including `/email-dashboard` and `/sms-dashboard`, with Convex Auth, skips automatic Convex Auth `code` handling on `/reset-password` so password-reset links keep their verification code, and allows protected API access for `/api/tickets(.*)`, `/api/retail-price-screenshot/upload-url`, and `/api/booking-confirmed-hotel-alert-attachments/upload-url` through either Convex Auth or a server-side `N8N_API_KEY` sent as `Authorization: Bearer <key>` or `x-api-key`.
- `/api/sara/staff-reply` is Convex Auth staff-only; `N8N_API_KEY` never grants staff reply or Sona control authority.
- Quo guest SMS delivery is server-only through `QUO_API_KEY` and `QUO_FROM`; `QUO_FROM` must be an E.164 number or Quo `PN...` identifier and guest recipients must use E.164 format.
- Every outbound Quo message must persist the provider message ID resolved by `lib/quo-provider.js` so delivery receipts match: conversational and staff replies through the SMS outbox, ticket lifecycle SMS through `ticketSmsReceipts`. Unmatched receipts are stored as ignored and still answered 2xx, because Quo disables the webhook after repeated failed deliveries and staff would otherwise have to re-enable it manually.
- SMS consent is canonical per normalized phone; every conversational, staff, and ticket-lifecycle provider call must pass a final Convex claim that rechecks STOP/START state, channel policy, test allowlist, and current control/message versions. The first Sona SMS disclosure uses one leased conversation claim, remains pending while queued, is released after failed or suppressed delivery, and is durably complete only after provider acceptance or delivery.
- Sona uses one server-side OpenAI Responses tool loop for web and SMS; the browser and model receive no direct Convex mutation credentials, and all CRM actions must remain constrained by `lib/sara-agent-server.js` and `convex/sara.ts`.
- Sona's quote intake must capture the referrer's name whenever the acquisition source is `promoter` or `referral`; `convex/acquisitionSource.ts` hard-blocks a blank, one-character, or placeholder name at both the tool boundary and `sara.createQuoteRequest`, Sona asks the guest instead of inventing one, and it hands off rather than downgrading the source to `direct`.
- `SARA_SERVICE_KEY` must use the same secret in the Next.js and Convex environments; it authenticates narrow server-to-Convex Sona operations and must never use a `NEXT_PUBLIC_` name.
- Keep `SARA_SERVICE_KEY` and `N8N_API_KEY` separate; Sona's key authenticates only Sona domains, while the same `N8N_API_KEY` value in Next.js and Convex authenticates existing ticket automation and delivery-stamp operations.
- Keep `saraWebEnabled` and `saraSmsEnabled` off until OpenAI, approved Knowledge, Terms, channel credentials, and staff handoff operations are ready; Quo must remain allowlist-only while `saraSmsTestMode` is active.
- Sona represents an independent private residence reservation service, identifies itself as AI, and must not imply it is the official Ritz-Carlton hotel reservations desk.
- Payment instructions require an active positive-price quote and acceptance of the current immutable Terms hash; after acceptance Sona sends them deterministically with the secure ticket link on web and SMS, while public `PAYMENT SUBMITTED` requires a server-confirmed, unexpired R2 upload receipt.
- Every newly created `QUOTE REQUESTED` ticket from the public form, staff workflow, or Sona must enqueue one Convex-owned quote webhook delivery keyed by ticket ID; delivery reads the persisted ticket and webhook settings, records outcomes, and retries transient failures without depending on the browser.
- Tickets carry a quote round: `quoteRevision`, `quoteToken`, and `quoteRequestedAt`. A re-quote round returns the ticket to `QUOTE REQUESTED`, clears pricing, Terms acceptance, retail-price screenshot keys, and price-sent delivery stamps while preserving staff `adjustment`, bumps the revision, mints a new token, enqueues one `quote-requote:<ticketId>:<revision>` delivery, and marks open older deliveries superseded.
- Automation callbacks that set `PRICE SENT`, a retail price, or a quote error must echo the ticket's current `quoteToken`; Convex rejects a superseded callback as a stale quote and the ticket API returns 409, so the n8n quote workflow must pass `quoteToken` from the webhook body into its ticket PATCH. Stamp-only automation updates stay unfenced.
- When a re-quoted ticket reaches `PRICE SENT` again, the ticket API attempts the existing lifecycle email/SMS and one deterministic Sona quote-ready conversation message per revision, skipping the conversational SMS when the lifecycle price-sent SMS already delivered; notification failure never rolls back the ticket update.
- Automation may record a guest-safe `quoteError` when external pricing returns no rate or fails; it must echo the current `quoteToken`, is fenced like a pricing callback, is cleared by every re-quote reset and by any successful `PRICE SENT` save, is shown to staff in the ticket actions dialog, is surfaced to Sona through `get_ticket_status` so it offers alternative dates or a specialist instead of stalling, and triggers one deterministic Sona quote-failure conversation message per revision.
- n8n workflow exports embed the live `N8N_API_KEY`; keep them untracked (root `.gitignore` excludes `StayAPI*.json`, `n8n-*.json`, and `n8n-workflows/`).
- Terms acceptance is deterministic rather than model-interpreted: web chat accepts only its version/hash-bound checkbox and button action; current SMS presentations accept the explicit whole-message allowlist `I AGREE`, `AGREE`, `I ACCEPT`, `ACCEPT`, `I AGREE TO THE TERMS`, `I ACCEPT THE TERMS`, `YES, I AGREE`, and `YES, I ACCEPT`, with case, whitespace, and safe trailing punctuation normalization; prior and legacy phrases remain bound to their presentation contracts, and Sona must never summarize or interpret the published legal Terms document while separate staff-approved policy FAQs may still be answered from Knowledge.
- Public staff registration defaults to disabled; `NEXT_PUBLIC_STAFF_REGISTRATION_ENABLED=true` is an explicit bootstrap/admin exception, not a production default.

## Verification

- Use `npm run build` for production build verification when behavior or routing changes are made.
- If an existing generated trace is not writable, use `NEXT_DIST_DIR=.next-verify npm run build` rather than changing ownership or deleting generated artifacts.
- `npm run lint` exists in `package.json`, but this Next.js 15 project may require lint script maintenance before it is a reliable check.

## Child DOX Index

- `app/AGENTS.md` owns App Router layouts, pages, route groups, global CSS, auth pages, and not-found behavior.
- `components/AGENTS.md` owns reusable React components outside route files, including layouts, forms, tickets, ticket preview/payment, home quote form, and auth helpers.
- `convex/AGENTS.md` owns Convex backend configuration, schema, HTTP routes, and Convex Auth provider setup.
- `lib/AGENTS.md` owns shared providers, auth context, Convex-backed store hooks, legacy localStorage migration helpers, calculations, app params, query client setup, and utilities.
- Root owns `middleware.js`, `hooks/`, `public/`, `.env.example`, root config files, package manifests, and workspace-level generated/ignored directories unless a child DOX is later added; `public/api-documentation.html` is the static custom App Router API reference and ticket workflow tutorial, and `public/crm-staff-guide.html` is the static staff-facing CRM status and email-alert operations guide.
- `.next/`, `.next-build/`, `.next-verify/`, and `node_modules/` are generated or installed artifacts and are not editable DOX domains.
