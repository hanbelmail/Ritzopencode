# App Routes

## Purpose

- Owns Next.js App Router files, global CSS, route layouts, guest auth pages, public route group, staff route group, app-level API routes, and app-level not-found behavior.

## Ownership

- `layout.jsx` wires Convex Auth providers, global providers, default app metadata, settings-driven browser title updates, manifest/favicon links, scrolling, and toast rendering.
- `globals.css` owns Tailwind globals and theme variables consumed across the app.
- `login/` and `register/` own guest authentication flows backed by Convex Auth through `lib/AuthContext.jsx`.
- `forgot-password/` and `reset-password/` own Convex Auth password reset request and verification flows.
- `api/tickets/` owns demo REST endpoints for fetching, status-filtered fetching, updating, deleting, and sending price-sent guest email/SMS notifications for Convex-backed reservation tickets.
- `api/payment-proof/` owns private Cloudflare R2 signed upload, server-side upload confirmation, and signed view URL endpoints for payment screenshots.
- `api/retail-price-screenshot/` owns private Cloudflare R2 signed upload and signed view URL endpoints for Ritz website retail price screenshots.
- `api/booking-confirmed-hotel-alert-attachments/` owns private Cloudflare R2 signed upload URLs for the two PDF attachments configured for booking-confirmed hotel email alerts.
- `api/quote-webhook/` owns server-side forwarding of public quote tickets to the configured external webhook.
- `api/quote-alerts/` owns server-side new quote staff email alerts through Resend and stamps tickets after successful delivery.
- `api/payment-submitted-alerts/` owns server-side payment-submitted staff email alerts through Resend, including payment proof screenshot attachments from R2 when present.
- `api/booking-request-hotel-alerts/` owns server-side payment-verified booking request hotel email alerts through Resend with the fixed `1609E` subject.
- `api/booking-confirmed-hotel-alerts/` owns server-side booking-confirmed hotel email alerts through Resend with the reservation confirmation number in the subject.
- `api/sara/chat/` owns the public web-chat adapter, opaque HTTP-only conversation sessions, origin checks, Sara execution, and safe transcript responses.
- `api/sara/staff-reply/` owns authenticated staff-only, stable-ID Quo reply dispatch after the staff reply and takeover are persisted in Convex.
- `api/webhooks/quo/` owns Quo message ingestion, webhook-token validation, event deduplication, SMS allowlist/test-mode enforcement, STOP/START processing, Sara execution, and outbound delivery tracking.
- `(public)/AGENTS.md` owns public guest pages and ticket lookup routes.
- `(staff)/AGENTS.md` owns authenticated staff pages.

## Local Contracts

- Route files may use client components where Convex hooks, auth context, browser navigation, or interactive state is required.
- API route handlers may call Convex backend functions through `ConvexHttpClient` and must preserve the Convex `tickets` table as the source of truth.
- Payment proof and retail price screenshot API routes must keep R2 objects private and return only short-lived signed URLs.
- Payment proof upload preparation requires current Terms acceptance; the confirmation endpoint must inspect the R2 object and confirm its nonzero image metadata before the receipt can be consumed by public payment submission.
- Retail price screenshot upload URLs are protected by Convex Auth or `N8N_API_KEY`; public read URL requests must validate the requested key against the ticket before returning a signed URL.
- Ticket API updates that leave a reservation in `PRICE SENT` must attempt the server-side Resend guest email and Quo guest SMS paths and return notification metadata without rolling back the ticket update when either delivery fails.
- Price-sent notification API routes must send guest emails server-side through Resend when `priceSentGuestEmailEnabled` is active, attach the retail price screenshot from R2 when `retailPriceScreenshotKey` is present, optionally send the same email and attachment to active staff recipients when the disabled-by-default staff copy setting is enabled, and stamp tickets only after each successful delivery.
- Price-sent notification API routes must send Quo guest SMS when `priceSentSmsEnabled` is active and the ticket has an E.164 phone number, render the selected `priceSentSmsTemplates` entry with quote pricing placeholders, and stamp `priceSentSmsSentAt` only after Quo accepts delivery.
- Ticket API updates that change price or stay-date inputs must recalculate derived pricing fields with `lib/calc.js` and Convex-backed settings.
- Quote webhook forwarding must read `webhookUrl` and `webhookEnabled` from Convex-backed settings before calling any external URL.
- Quote alert delivery must read email alert settings and active staff recipients from Convex-backed settings, send through server-side Resend credentials, and stamp `quoteAlertEmailSentAt` only after successful delivery.
- Payment-submitted alert delivery must read email alert settings and active staff recipients from Convex-backed settings, attach the private payment proof screenshot from R2 when `paymentScreenshotKey` is present, and stamp `paymentSubmittedStaffEmailSentAt` only after successful delivery.
- Booking requests hotel alert delivery must read email alert settings and active hotel recipients from Convex-backed settings after `PAYMENT VERIFIED`, use the fixed `1609E` subject, and stamp `bookingRequestHotelEmailSentAt` only after successful delivery.
- Booking confirmed hotel alert delivery must read email alert settings and active hotel recipients from Convex-backed settings after `BOOKING CONFIRMED`, attach up to two configured private R2 PDFs, use `Ritz Confirmation #: <reservation confirmation number>` as the subject, and stamp `bookingConfirmedHotelEmailSentAt` only after successful delivery.
- Preserve App Router route group semantics; `(public)` and `(staff)` folders are URL-invisible boundaries.
- Keep route-level reservation/settings data mutations delegated to Convex-backed hooks in `lib/store.js`.
- Public Sara chat must reject cross-origin writes, keep the session token HTTP-only, enforce message limits, and use `PUBLIC_APP_URL` for durable guest links when configured.
- Production Quo webhooks must validate the standard `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers against `QUO_WEBHOOK_SECRET` with a five-minute replay window; `QUO_WEBHOOK_TOKEN` is a development-only local payload fallback.
- Failed Quo signature checks may log only the rejection reason, relevant header names, signature encoding shapes, and non-secret HMAC algorithm match labels; never log webhook payloads, header values, signing secrets, or guest data.
- Quo webhook processing must store disabled or non-allowlisted inbound messages without sending a paid response, and unsupported MMS proof must redirect the guest to the secure ticket upload path.
- Quo webhook workers use owned leases; terminal duplicates return success, active leases return a retryable non-2xx response, and deterministic pending replies recover on provider retries without duplicating ambiguous sends.

## Work Guidance

- Use existing shared components from `components/` before creating route-local UI.
- Keep public and staff navigation behavior aligned with their layout components.
- Update this file and affected child DOX files when adding durable route groups or changing route responsibilities.

## Verification

- Run `npm run build` after routing, layout, metadata, or global CSS changes when feasible.

## Child DOX Index

- `(public)/AGENTS.md` owns guest-facing marketing, quote, gallery, FAQ, room info, and ticket lookup pages.
- `(staff)/AGENTS.md` owns authenticated reservation management pages and staff layout routing.
