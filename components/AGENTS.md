# Components

## Purpose

- Owns reusable React components shared by app routes, including layouts, auth helpers, reservation ticket UI, forms, home quote UI, and UI primitives.

## Ownership

- Top-level components own cross-route shells and utilities such as `StaffLayout.jsx`, `PublicLayout.jsx`, `AuthLayout.jsx`, `ProtectedRoute.jsx`, and `ScrollToTop.jsx`.
- `forms/` owns reservation form inputs shared by staff and quote flows.
- `home/` owns public-home-specific quote components.
- `ticket/` owns single-ticket preview and payment-dialog components.
- `tickets/` owns staff reservation list, card, table, stats, status badge components, reservation confirmation number table display, and quick editing in the ticket dialog.
- `chat/AGENTS.md` owns the public Sara chat launcher, dialog, transcript, composer, and web-chat transport behavior.
- `ui/AGENTS.md` owns shadcn-style UI primitives and toast helpers.

## Local Contracts

- Components must not introduce new persistence contracts; route mutations and storage live in `lib/`.
- `PublicLayout.jsx` must not mount the Sara guest chat widget on `/ticket` or `/ticket/*` reservation pages.
- `components/home/QuoteForm.jsx` creates Convex quote tickets through `lib/store.js` and may call the app-level quote webhook route after creation.
- `components/home/QuoteForm.jsx` requires at least one guest name, check-in, check-out, room name, and a valid email before creating a public quote ticket.
- `components/home/QuoteForm.jsx` auto-selects the only visible room type from settings for public quote requests.
- `components/home/QuoteForm.jsx` does not render room-name selection in the public quote UI; room data remains part of form state and ticket creation.
- `components/home/QuoteForm.jsx` accepts familiar US/Canada phone formatting, displays the normalized E.164 value after blur, and persists that normalized value.
- `components/home/QuoteForm.jsx` limits public quote requests to 4 guest names, including children; `components/forms/GuestNamesInput.jsx` accepts optional `maxGuests` for callers that need a cap.
- `components/forms/ReservationDatePicker.jsx` marks finalized reservations (`PAYMENT VERIFIED`, `BOOKING CONFIRMED`) and must preserve same-day checkout/check-in turnover behavior.
- `components/ticket/PayDialog.jsx` displays the exact immutable Terms content and version, records acceptance before revealing configured payment instructions, and requires an image proof upload.
- Keep shared components route-agnostic unless they are in a domain folder such as `home/`, `ticket/`, or `tickets/`.
- Preserve `@/components/ui/*` import paths for UI primitives.

## Work Guidance

- Prefer composing existing `components/ui/` primitives before adding new styling primitives.
- Keep domain components focused on display and interaction; business calculations belong in `lib/calc.js` or `lib/store.js`.

## Verification

- Run `npm run build` after component API or layout changes when feasible.

## Child DOX Index

- `ui/AGENTS.md` owns reusable UI primitive components generated or maintained in shadcn style.
- `chat/AGENTS.md` owns Sara guest chat components.
