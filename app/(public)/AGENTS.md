# Public Routes

## Purpose

- Owns guest-facing pages for property marketing, quote requests, information pages, FAQ, and public ticket lookup.

## Ownership

- `layout.jsx` wraps public pages with `components/PublicLayout.jsx`.
- `page.jsx` owns the public home page, room marketing content, ticket lookup entry point, and quote form placement.
- `faq/` and `ritz-info/` own guest information content.
- `ticket/[id]/` owns public reservation ticket display by ticket ID, including signed-read display of the retail price screenshot when attached.

## Local Contracts

- Public pages must not require staff authentication.
- Ticket lookup and quote flows use Convex-backed reservation data through `lib/store.js`.
- Quote requests may trigger the configured server-side quote webhook after the Convex ticket is created.
- Keep guest-facing money, cleaning fee, room type, discount, and retail price screenshot displays consistent with Convex-backed settings from `lib/store.js`, R2 object keys on tickets, and `lib/calc.js` formatting/calculations.

## Work Guidance

- Preserve mobile-friendly public layouts and direct paths to quote and ticket lookup flows.
- Avoid duplicating staff-only reservation management controls in public routes.

## Verification

- Run `npm run build` after route or layout changes when feasible.

## Child DOX Index

- No child DOX files.
