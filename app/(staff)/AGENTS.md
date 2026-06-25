# Staff Routes

## Purpose

- Owns authenticated staff reservation management pages, analytics, staff-only quote webhook settings, and public home page design selection.

## Ownership

- `layout.jsx` owns client-side staff route guarding and wraps pages with `components/StaffLayout.jsx`; `middleware.js` owns server-side staff route redirects.
- `dashboard/` owns reservation list, board/table switching, table column controls, filtering, CSV export, deletion, status updates, price-sent email triggering, and summary stats.
- `analytics/` owns staff-only reservation analytics computed from Convex tickets, including KPI cards, charts, grouped tables, date range filtering, and analytics CSV export.
- `api-dashboard/` owns the staff-only quote webhook URL/enabled setting and the public home page variant setting.
- `new/` owns reservation creation and edit saves, optional retail price screenshot upload to R2, warning before `PRICE SENT` saves without that screenshot, and price-sent email triggering after a `PRICE SENT` save.
- `calendar/`, `clients/`, and `settings/` own their respective staff management views; `settings/` includes hotel info and the persisted app name used for the browser/tab title.

## Local Contracts

- Staff pages must remain behind Convex Auth checks and redirect unauthenticated users to `/login`.
- Staff reservation mutations use Convex-backed hooks from `lib/store.js`; do not create separate persistence flows without updating `lib/AGENTS.md` and `convex/AGENTS.md`.
- Status labels must stay aligned with `STATUSES` from `lib/store.js`.
- Saving or changing a reservation to `PRICE SENT` should call the protected notification API after Convex persistence so guests receive the ticket link and quote details once; if a retail price screenshot is selected, upload it and persist `retailPriceScreenshotKey` before calling the notification API.

## Work Guidance

- Keep Convex/shared data messaging accurate when persistence behavior changes.
- Reuse reservation components from `components/tickets/`, form helpers from `components/forms/`, and UI primitives from `components/ui/`.

## Verification

- Run `npm run build` after staff routing or reservation workflow changes when feasible.

## Child DOX Index

- No child DOX files.
