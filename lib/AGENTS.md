# Shared Library

## Purpose

- Owns shared providers, authentication context, Convex-backed reservation/settings/dashboard preference store hooks, price-sent email/SMS, quote-alert, payment-submitted, booking-request hotel, and booking-confirmed hotel helpers, UI preference/localStorage fallback helpers, legacy localStorage migration helpers, calculations, query client setup, app params, not-found component, and utilities.

## Ownership

- `defaults.js` owns server-safe default settings, including the default app name, public home page variant, quote webhook defaults, email/SMS alert defaults, and payment method constants shared by client hooks and API routes.
- `convex-server.js` owns server-side Convex HTTP client creation and JSON error helpers for App Router API routes.
- `r2.js` owns server-side Cloudflare R2 S3 client setup, signed URL helpers, key validation helpers, and server-side attachment reads for private payment proof, retail price screenshot, and booking-confirmed alert PDF objects.
- `store.js` owns full-list and paginated reservation tickets/settings client hooks, account-scoped dashboard preference hooks and normalization, persisted status constants, dashboard filter option constants, default/settings normalization, and legacy `ritz_*` localStorage migration keys.
- `price-sent-email.js` owns the client helper for calling the protected price-sent guest email/SMS notification API after ticket saves and summarizing its results.
- `price-sent-email-server.js` owns the server-side Resend template, delivery, retail price screenshot attachment, `priceSentGuestEmailEnabled` skip rule, successful-delivery ticket stamps for price-sent guest emails, and the disabled-by-default staff copy.
- `price-sent-sms-server.js` owns server-side Quo delivery, E.164 validation, price-sent SMS template rendering, skip rules, and `priceSentSmsSentAt` delivery stamps.
- `price-sent-notifications-server.js` owns independent dispatch of price-sent email and SMS delivery.
- `phone.js` owns shared E.164 phone normalization and validation.
- `sms-templates.js` owns normalization, legacy single-template migration, active-template selection, and required-placeholder validation for the three price-sent SMS templates.
- `quote-alert-email-server.js` owns the server-side Resend template, active staff-recipient filtering, skip rules, and successful-delivery ticket stamp for new quote staff alerts.
- `payment-submitted-alert.js` owns the client helper for calling the payment-submitted staff alert API after ticket payment updates.
- `payment-submitted-alert-email-server.js` owns the server-side Resend template, active staff-recipient filtering, payment proof screenshot attachment, skip rules, and successful-delivery ticket stamp for payment-submitted staff alerts.
- `booking-request-hotel-alert.js` owns the client helper for calling the Booking Requests Hotel Alert API after payment-verification saves or updates.
- `booking-request-hotel-alert-email-server.js` owns the server-side Resend booking-request template, active hotel-recipient filtering, fixed `1609E` subject, skip rules, and successful-delivery ticket stamp for Booking Requests Hotel Alerts.
- `booking-confirmed-hotel-alert.js` owns the client helper for calling the Booking Confirmed Hotel Alert API after booking-confirmation saves or updates.
- `booking-confirmed-hotel-alert-email-server.js` owns the server-side Resend confirmation template, active hotel-recipient filtering, confirmation-number subject, skip rules, and successful-delivery ticket stamp for Booking Confirmed Hotel Alerts.
- `StoreMigrator.jsx` owns one-time import of legacy browser-local reservation/settings data into Convex.
- `ui-preferences.js` owns browser-local UI preference fallback keys such as dashboard table column visibility before Convex dashboard preferences are available.
- `AuthContext.jsx` adapts Convex Auth state/actions to the app's existing `useAuth()` contract.
- `Providers.jsx` and `query-client.js` own app-wide client context providers outside Convex Auth.
- `calc.js` owns money formatting and reservation price/date calculations.
- `utils.js` owns shared utility helpers such as class-name composition.

## Local Contracts

- Treat Convex `tickets` and `settings` tables as the live persistence contract for reservation/settings data, including app name, public home page variant, quote webhook URL/enabled settings, email/SMS alert settings and staff/hotel recipients, `bookingConfirmedHotelAlertAttachments`, `reservationConfirmationNumber`, `priceSentGuestEmailEnabled`, `priceSentSmsEnabled`, `priceSentSmsTemplates`, `priceSentSmsTemplateId`, `quoteAlertEmailSentAt`, `priceSentEmailSentAt`, `priceSentSmsSentAt`, `priceSentStaffEmailSentAt`, `paymentSubmittedStaffEmailSentAt`, `bookingRequestHotelEmailSentAt`, `bookingConfirmedHotelEmailSentAt`, and R2 object-key fields such as `paymentScreenshotKey` and `retailPriceScreenshotKey`.
- Treat legacy `ritz_*` localStorage keys as import-only compatibility contracts for existing browser data.
- Keep dashboard paginated ticket hook arguments aligned with `convex/tickets.ts` pagination and filter query args.
- Keep dashboard preference hooks aligned with `convex/dashboardPreferences.ts`; validate saved view mode, status filters, date filters, page size, and visible columns before writing them.
- Keep browser-only storage access guarded for server rendering where applicable.
- Keep R2 credentials server-only; client components must use API routes for signed payment proof, retail price screenshot, and booking-confirmed alert PDF upload URLs.
- Do not duplicate status, payment method, settings, or ticket schema constants in route or component files.

## Work Guidance

- When changing persisted settings shapes, include migration/default handling near `normalizeSettings()`.
- Keep calculation logic deterministic and independent from React components.
- Keep auth behavior consistent with staff route guards in `app/(staff)/AGENTS.md`.

## Verification

- Run `npm run build` after provider, auth, persistence, or calculation changes when feasible.

## Child DOX Index

- No child DOX files.
