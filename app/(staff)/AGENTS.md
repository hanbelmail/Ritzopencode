# Staff Routes

## Purpose

- Owns authenticated staff reservation management pages, analytics, staff-only quote webhook settings, guest email/SMS alert settings, and public home page design selection.

## Ownership

- `layout.jsx` owns client-side staff route guarding and wraps pages with `components/StaffLayout.jsx`; `middleware.js` owns server-side staff route redirects.
- `dashboard/` owns the server-paginated reservation list, board/table switching, account-scoped saved dashboard preferences, table column controls, table row action dialogs, multi-status filtering with status counts, CSV export, deletion, status updates, price-sent email triggering, and summary stats.
- `analytics/` owns staff-only reservation analytics computed from Convex tickets, including KPI cards, charts, grouped tables, date range filtering, and analytics CSV export.
- `api-dashboard/` owns the staff-only quote webhook URL/enabled setting and the public home page variant setting.
- `email-dashboard/` owns guest, staff, and hotel email alert controls, active/inactive staff email recipients, active/inactive hotel email recipients, the new quote alert setting, the active-by-default guest price-sent email setting, the disabled-by-default price-sent staff copy setting, the disabled-by-default payment-submitted staff alert setting, the disabled-by-default Booking Requests and Booking Confirmed Hotel Alert settings, and up to two saved PDF attachments for booking-confirmed alerts.
- `sms-dashboard/` owns the active/inactive guest price-sent SMS alert, three editable/selectable Quo templates, and their quote pricing, ticket-link, screenshot-link, and cleaning-fee placeholders.
- `new/` owns reservation creation and edit saves, the optional staff-entered `reservationConfirmationNumber`, optional retail price screenshot upload to R2, warning before `PRICE SENT` saves without that screenshot, and status-driven email alert triggering after saves.
- `calendar/`, `clients/`, and `settings/` own their respective staff management views; `settings/` includes hotel info and the persisted app name used for the browser/tab title.

## Local Contracts

- Staff pages must remain behind Convex Auth checks and redirect unauthenticated users to `/login`.
- Staff reservation mutations use Convex-backed hooks from `lib/store.js`; do not create separate persistence flows without updating `lib/AGENTS.md` and `convex/AGENTS.md`.
- Dashboard reservation filtering and paging use the paginated Convex ticket query through `lib/store.js`; avoid reintroducing full-list browser filtering for the main dashboard list.
- Dashboard defaults to table view for staff accounts without saved preferences; view mode, search text, status filters, date filter, page size, and table column visibility persist per authenticated staff account through Convex dashboard preferences; pagination cursor/page index and selected row IDs remain session-only.
- Status labels must stay aligned with `STATUSES` from `lib/store.js`.
- Saving or changing a reservation to `PRICE SENT` should call the protected notification API after Convex persistence; when enabled, guests receive the ticket link and quote details by email and the ticket link by Quo SMS once each; if a retail price screenshot is selected, upload it and persist `retailPriceScreenshotKey` before calling the notification API.
- `new/` must validate before saving that a reservation has at least one guest name, check-in, check-out, room type, valid email, valid status, and a positive retail price and E.164 guest phone number when status is `PRICE SENT`.
- `new/` auto-selects the only visible room type for new reservations and edit-mode tickets without a saved room, and preserves saved edit-mode room/status values in selects even when settings changed.
- `PRICE SENT` notification delivery may also send the same guest email and retail screenshot attachment to active staff recipients when email alerts and `priceSentStaffAlertEnabled` are enabled; staff copy delivery is stamped with `priceSentStaffEmailSentAt`.
- `PAYMENT SUBMITTED` changes should trigger the payment-submitted staff alert API after Convex persistence; the alert attaches the payment proof screenshot when `paymentScreenshotKey` is present and stamps `paymentSubmittedStaffEmailSentAt`.
- `PAYMENT VERIFIED` saves or updates should trigger the booking requests hotel alert API after Convex persistence; the alert sends active hotel recipients the fixed-subject `1609E` booking request template and stamps `bookingRequestHotelEmailSentAt`.
- `BOOKING CONFIRMED` saves or updates should trigger the booking confirmed hotel alert API after Convex persistence; the alert sends the hotel confirmation template and up to two configured PDFs to active hotel recipients with subject `Ritz Confirmation #: <reservation confirmation number>` and stamps `bookingConfirmedHotelEmailSentAt`.
- Public quote creation triggers the new quote staff alert API after Convex persistence; delivery is skipped unless email alerts, the new quote alert, and at least one active staff recipient are configured.

## Work Guidance

- Keep Convex/shared data messaging accurate when persistence behavior changes.
- Reuse reservation components from `components/tickets/`, form helpers from `components/forms/`, and UI primitives from `components/ui/`.

## Verification

- Run `npm run build` after staff routing or reservation workflow changes when feasible.

## Child DOX Index

- No child DOX files.
