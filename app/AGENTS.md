# App Routes

## Purpose

- Owns Next.js App Router files, global CSS, route layouts, guest auth pages, public route group, staff route group, app-level API routes, and app-level not-found behavior.

## Ownership

- `layout.jsx` wires Convex Auth providers, global providers, default app metadata, settings-driven browser title updates, manifest/favicon links, scrolling, and toast rendering.
- `globals.css` owns Tailwind globals and theme variables consumed across the app.
- `login/` and `register/` own guest authentication flows backed by Convex Auth through `lib/AuthContext.jsx`.
- `forgot-password/` and `reset-password/` own Convex Auth password reset request and verification flows.
- `api/tickets/` owns demo REST endpoints for fetching, status-filtered fetching, updating, deleting, and sending price-sent guest email notifications for Convex-backed reservation tickets.
- `api/payment-proof/` owns private Cloudflare R2 signed upload and signed view URL endpoints for payment screenshots.
- `api/retail-price-screenshot/` owns private Cloudflare R2 signed upload and signed view URL endpoints for Ritz website retail price screenshots.
- `api/quote-webhook/` owns server-side forwarding of public quote tickets to the configured external webhook.
- `api/quote-alerts/` owns server-side new quote staff email alerts through Resend and stamps tickets after successful delivery.
- `api/payment-submitted-alerts/` owns server-side payment-submitted staff email alerts through Resend, including payment proof screenshot attachments from R2 when present.
- `api/booking-confirmed-hotel-alerts/` owns server-side booking-confirmed hotel email alerts through Resend with the fixed `1609E` subject.
- `(public)/AGENTS.md` owns public guest pages and ticket lookup routes.
- `(staff)/AGENTS.md` owns authenticated staff pages.

## Local Contracts

- Route files may use client components where Convex hooks, auth context, browser navigation, or interactive state is required.
- API route handlers may call Convex backend functions through `ConvexHttpClient` and must preserve the Convex `tickets` table as the source of truth.
- Payment proof and retail price screenshot API routes must keep R2 objects private and return only short-lived signed URLs.
- Retail price screenshot upload URLs are protected by Convex Auth or `N8N_API_KEY`; public read URL requests must validate the requested key against the ticket before returning a signed URL.
- Ticket API updates that leave a reservation in `PRICE SENT` must attempt the server-side Resend guest email path and return notification metadata without rolling back the ticket update when email delivery fails.
- Price-sent notification API routes must send guest emails server-side through Resend, attach the retail price screenshot from R2 when `retailPriceScreenshotKey` is present, optionally send the same email and attachment to active staff recipients when the disabled-by-default staff copy setting is enabled, and stamp tickets only after each successful delivery.
- Ticket API updates that change price or stay-date inputs must recalculate derived pricing fields with `lib/calc.js` and Convex-backed settings.
- Quote webhook forwarding must read `webhookUrl` and `webhookEnabled` from Convex-backed settings before calling any external URL.
- Quote alert delivery must read email alert settings and active staff recipients from Convex-backed settings, send through server-side Resend credentials, and stamp `quoteAlertEmailSentAt` only after successful delivery.
- Payment-submitted alert delivery must read email alert settings and active staff recipients from Convex-backed settings, attach the private payment proof screenshot from R2 when `paymentScreenshotKey` is present, and stamp `paymentSubmittedStaffEmailSentAt` only after successful delivery.
- Booking-confirmed hotel alert delivery must read email alert settings and active hotel recipients from Convex-backed settings, use the fixed `1609E` subject, and stamp `bookingConfirmedHotelEmailSentAt` only after successful delivery.
- Preserve App Router route group semantics; `(public)` and `(staff)` folders are URL-invisible boundaries.
- Keep route-level reservation/settings data mutations delegated to Convex-backed hooks in `lib/store.js`.

## Work Guidance

- Use existing shared components from `components/` before creating route-local UI.
- Keep public and staff navigation behavior aligned with their layout components.
- Update this file and affected child DOX files when adding durable route groups or changing route responsibilities.

## Verification

- Run `npm run build` after routing, layout, metadata, or global CSS changes when feasible.

## Child DOX Index

- `(public)/AGENTS.md` owns guest-facing marketing, quote, gallery, FAQ, room info, and ticket lookup pages.
- `(staff)/AGENTS.md` owns authenticated reservation management pages and staff layout routing.
