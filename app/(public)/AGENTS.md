# Public Routes

## Purpose

- Owns guest-facing pages for property marketing, quote requests, photo gallery, information pages, FAQ, and public ticket lookup.

## Ownership

- `layout.jsx` wraps public pages with `components/PublicLayout.jsx`.
- `page.jsx` owns the public home page variants, room marketing content, ticket lookup entry point, and quote form placement.
- `gallery/` owns the public property photo gallery for suite, spa, recreation, fitness, and dining imagery.
- `faq/` and `ritz-info/` own guest information content.
- `terms/[version]/` renders immutable published booking Terms by version and content-hash reference.
- `ticket/[id]/` owns public reservation ticket display by ticket ID, including signed-read display of the retail price screenshot when attached and a public redirect that creates a fresh private screenshot URL for guest SMS links.
- `components/PublicLayout.jsx` mounts `components/chat/GuestChatWidget.jsx` once across public pages when `saraWebEnabled` is active.

## Local Contracts

- Public pages must not require staff authentication.
- Ticket lookup, quote, and payment submission flows use Convex-backed reservation data through `lib/store.js`.
- Quote requests may trigger the configured server-side quote webhook after the Convex ticket is created.
- Guest payment submissions require an active positive-price quote without an overlapping payment hold, exact acceptance of the current immutable Terms hash, and a server-confirmed private R2 proof receipt before updating tickets to `PAYMENT SUBMITTED`; successful persistence may trigger the staff payment-submitted alert.
- Keep guest-facing money, cleaning fee, room type, discount, reservation confirmation number, and retail price screenshot displays consistent with Convex-backed settings from `lib/store.js`, R2 object keys on tickets, and `lib/calc.js` formatting/calculations.
- `/ticket/[id]/retail-price-image` must validate the ticket's stored screenshot key before redirecting to a short-lived private R2 URL; the durable redirect URL follows the same opaque-ticket-ID access model as the public ticket page.
- Public `/` must render the Convex-backed `homePageVariant`, defaulting to the classic home page for existing settings.
- Public chat must use `/api/sara/chat`; it must not call OpenAI or Sara CRM mutations directly from the browser.
- The Sara launcher must remain above the fixed mobile navigation, while the open dialog uses safe-area padding and keeps staff/auth routes outside its scope.

## Work Guidance

- Preserve mobile-friendly public layouts and direct paths to quote and ticket lookup flows.
- Public home variants render fixed top navigation on desktop, while mobile keeps the bottom public nav and a compact fixed top quote CTA.
- Avoid duplicating staff-only reservation management controls in public routes.
- Use `Welcome, {primaryGuest}` for public ticket guest greetings.
- Public ticket links to `/ritz-info` and `/faq` should open in a new browser tab.

## Verification

- Run `npm run build` after route or layout changes when feasible.

## Child DOX Index

- No child DOX files.
