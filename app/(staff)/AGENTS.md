# Staff Routes

## Purpose

- Owns authenticated staff reservation management pages, analytics, staff-only quote webhook settings, guest email/SMS alert settings, and public home page design selection.

## Ownership

- `layout.jsx` owns client-side staff route guarding and wraps pages with `components/StaffLayout.jsx`; `middleware.js` owns server-side staff route redirects.
- `dashboard/` owns the server-paginated reservation list, board/table switching, account-scoped saved dashboard preferences, table column controls, shared board-card/table-row action dialogs, multi-status filtering with status counts, CSV export, deletion, status updates, price-sent email triggering, and summary stats.
- `attention/` owns the staff-only Needs attention queue, recent new-inquiry/operational email history, per-attempt details, bounded retry actions, and delivery-issue review actions. `email-dashboard/` owns the independent Needs attention email switch; `sara-dashboard/` supports `?conversation=<publicId>` links into its inbox.
- `analytics/` owns staff-only reservation analytics computed from Convex tickets, including KPI cards, charts, grouped tables, date range filtering, and analytics CSV export.
- `api-dashboard/` owns the staff-only quote webhook URL/enabled setting and the public home page variant setting.
- `email-dashboard/` owns guest, staff, and hotel email alert controls, active/inactive staff email recipients, active/inactive hotel email recipients, the new quote alert setting, the active-by-default guest price-sent email setting, the disabled-by-default price-sent staff copy setting, the disabled-by-default payment-submitted staff alert setting, the disabled-by-default Booking Requests and Booking Confirmed Hotel Alert settings, and up to two saved PDF attachments for booking-confirmed alerts.
- `sms-dashboard/` owns tabbed guest lifecycle SMS settings for `PRICE SENT`, `PAYMENT SUBMITTED`, `PAYMENT VERIFIED`, and `BOOKING CONFIRMED`; each status has an independent disabled-by-default switch and active editable Quo template selection, with three price-sent templates and two templates for each later status.
- `sms-dashboard/` also owns the Scheduled guest reminders section: separate off-by-default quote/checkout switches, editable templates/previews, checkout Hawaii send time, and the latest 100 reminder jobs with provider receipt states. Saving enabled settings may schedule existing eligible reservations within the active reminder window.
- `new/` owns reservation creation and edit saves, the staff-entered `reservationConfirmationNumber` that must be saved before booking confirmation, optional retail price screenshot upload to R2, warning before `PRICE SENT` saves without that screenshot, and status-driven email alert triggering after saves.
- `calendar/`, `clients/`, and `settings/` own their respective staff management views; `settings/` includes hotel info, the persisted app name used for the browser/tab title, and the global desktop table Columns-button visibility setting.
- `sara-dashboard/` owns Sona web/SMS activation, the code-controlled Sona name and initial disclosure display, model and quote-validity settings, approved Terms and editable handoff messaging, SMS test allowlists, Knowledge draft/approval management, conversation review, human pause/resume controls, confirmed conversation deletion for testing cleanup, and the read-only Quo webhook health panel reporting recent provider event types, statuses, attempts, and failures.

## Local Contracts

- Staff pages must remain behind Convex Auth checks and redirect unauthenticated users to `/login`.
- Staff reservation mutations use Convex-backed hooks from `lib/store.js`; do not create separate persistence flows without updating `lib/AGENTS.md` and `convex/AGENTS.md`.
- Dashboard reservation filtering and paging use the paginated Convex ticket query through `lib/store.js`; avoid reintroducing full-list browser filtering for the main dashboard list.
- Dashboard defaults to table view for staff accounts without saved preferences; view mode, search text, status filters, date filter, page size, and table column visibility persist per authenticated staff account through Convex dashboard preferences; pagination cursor/page index and selected row IDs remain session-only.
- The dashboard table Columns button is always hidden below the `md` breakpoint and appears on desktop only when the global `tableColumnsButtonVisible` setting is enabled; its field selections remain per authenticated staff account.
- Dashboard table rows and To Do cards open the same reservation action dialog; To Do cards do not use a separate action menu or navigate directly when the card is clicked.
- Status labels must stay aligned with `STATUSES` from `lib/store.js`.
- Saving or changing a reservation to `PRICE SENT` should call the protected notification API after Convex persistence; when enabled, guests receive the ticket link and quote details by email and the ticket link by Quo SMS once each, and a linked Sona conversation receives the same price-sent message once per quote revision unless Sona is paused or that revision was already notified; if a retail price screenshot is selected, upload it and persist `retailPriceScreenshotKey` before calling the notification API.
- `new/` must validate before saving that a reservation has at least one guest name, check-in, check-out, room type, valid email, valid status, and a positive retail price and E.164 guest phone number when status is `PRICE SENT`.
- `new/` and dashboard quick actions must require a nonblank persisted `reservationConfirmationNumber` from an earlier save before allowing a transition to `BOOKING CONFIRMED`; unsaved form text cannot satisfy this requirement.
- `new/` accepts familiar US/Canada guest phone formatting, normalizes it to `+1` E.164 on blur, and persists the normalized value.
- `new/` auto-selects the only visible room type for new reservations and edit-mode tickets without a saved room, and preserves saved edit-mode room/status values in selects even when settings changed.
- `PRICE SENT` notification delivery may also send the same guest email and retail screenshot attachment to active staff recipients when email alerts and `priceSentStaffAlertEnabled` are enabled; staff copy delivery is stamped with `priceSentStaffEmailSentAt`.
- `PAYMENT SUBMITTED` changes should trigger the payment-submitted staff alert API after Convex persistence; the alert attaches the payment proof screenshot when `paymentScreenshotKey` is present and stamps `paymentSubmittedStaffEmailSentAt`.
- `PAYMENT VERIFIED` saves or updates should trigger the booking requests hotel alert API after Convex persistence; the alert sends active hotel recipients the fixed-subject `1609E` booking request template and stamps `bookingRequestHotelEmailSentAt`.
- `BOOKING CONFIRMED` saves or updates should trigger the booking confirmed hotel alert API after Convex persistence; the alert sends the hotel confirmation template and up to two configured PDFs to active hotel recipients with subject `Ritz Confirmation #: <reservation confirmation number>` and stamps `bookingConfirmedHotelEmailSentAt`.
- The same three status notification calls must independently attempt the enabled guest SMS and preserve one successful Quo acceptance per ticket/status; missing or invalid guest data skips SMS without rolling back the reservation status or suppressing staff/hotel email.
- Public, Sona, and staff quote creation atomically queue the new-inquiry staff alert in Convex. Delivery requires email alerts, the new quote alert, and active recipients; it remains eligible if pricing finishes first. Staff pages do not dispatch new-inquiry email themselves.
- The Needs attention screen distinguishes provider acceptance from confirmed inbox delivery, shows suppression/failure reasons and provider IDs, and links to the owning reservation/conversation. Retry uses the existing idempotent job; marking a delivery issue reviewed does not resend the guest message. Quote/handoff issues clear when their underlying state is resolved.
- Scheduled reminder history distinguishes accepted, delivered, delivery_failed, skipped and unknown outcomes. Do not offer automated resend for ambiguous results; staff must check Quo history and resolve the existing Needs attention delivery issue. Display all reminder schedules in Hawaii time and make the opt-in side effect on existing eligible reservations explicit.
- Creating a `QUOTE REQUESTED` reservation automatically queues the same durable Convex quote webhook used by public and Sona quote creation; staff pages do not dispatch that webhook themselves.
- Sona channels are disabled by default; staff must review and publish Knowledge entries individually, configure Terms, and test the website before enabling Quo SMS.
- Staff human takeover increments the conversation control version and sets `aiEnabled` false. Web replies persist directly; SMS replies require Convex Auth, stable message IDs, active channel/test policy, and current phone consent, and expose delivery state in the transcript.
- Staff conversation deletion removes conversation-owned transcripts, agent runs, and SMS outbox records; it detaches but preserves linked reservation tickets and preserves contacts, SMS consent, reservation events, and provider webhook history.
- The Sona webhook health panel is read-only staff reporting from `messaging.listForStaff`; it surfaces event types, statuses, attempts, notes, and bounded error text only, and re-enabling a webhook that Quo disabled remains a manual action in Quo settings.
- Syncing the 42 starter Knowledge entries inserts missing drafts and refreshes changed non-archived starter entries; Sona-only branding migrations preserve approval, other changed approved entries return to draft for staff review, and archived entries remain untouched.

## Work Guidance

- Keep Convex/shared data messaging accurate when persistence behavior changes.
- Reuse reservation components from `components/tickets/`, form helpers from `components/forms/`, and UI primitives from `components/ui/`.

## Verification

- Run `npm run build` after staff routing or reservation workflow changes when feasible.

## Child DOX Index

- No child DOX files.
