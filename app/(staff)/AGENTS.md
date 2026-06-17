# Staff Routes

## Purpose

- Owns authenticated staff reservation management pages and staff-only API testing tools.

## Ownership

- `layout.jsx` owns client-side staff route guarding and wraps pages with `components/StaffLayout.jsx`; `middleware.js` owns server-side staff route redirects.
- `dashboard/` owns reservation list, board/table switching, filtering, deletion, status updates, and summary stats.
- `api-dashboard/` owns the staff-only demo console for testing ticket API requests and managing the quote webhook URL/enabled setting.
- `new/` owns reservation creation.
- `calendar/`, `clients/`, and `settings/` own their respective staff management views.

## Local Contracts

- Staff pages must remain behind Convex Auth checks and redirect unauthenticated users to `/login`.
- Staff reservation mutations use Convex-backed hooks from `lib/store.js`; do not create separate persistence flows without updating `lib/AGENTS.md` and `convex/AGENTS.md`.
- Status labels must stay aligned with `STATUSES` from `lib/store.js`.

## Work Guidance

- Keep Convex/shared data messaging accurate when persistence behavior changes.
- Reuse reservation components from `components/tickets/`, form helpers from `components/forms/`, and UI primitives from `components/ui/`.

## Verification

- Run `npm run build` after staff routing or reservation workflow changes when feasible.

## Child DOX Index

- No child DOX files.
