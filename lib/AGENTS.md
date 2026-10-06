# Shared Library

## Purpose

- Owns shared providers, authentication context, Convex-backed reservation/settings/dashboard preference store hooks, price-sent and ticket-lifecycle SMS, quote-alert, payment-submitted, booking-request hotel, and booking-confirmed hotel helpers, UI preference/localStorage fallback helpers, legacy localStorage migration helpers, calculations, query client setup, app params, not-found component, and utilities.

## Ownership

- `defaults.js` owns server-safe default settings, including the default app name, dashboard desktop Columns-button visibility, public home page variant, quote webhook defaults, email/SMS alert defaults, and payment method constants shared by client hooks and API routes.
- `convex-server.js` owns server-side Convex HTTP client creation and JSON error helpers for App Router API routes.
- `r2.js` owns server-side Cloudflare R2 S3 client setup, signed URL helpers, payment-proof object inspection, key validation helpers, and server-side attachment reads for private payment proof, retail price screenshot, and booking-confirmed alert PDF objects.
- `store.js` owns full-list and paginated reservation tickets/settings client hooks, account-scoped dashboard preference hooks and normalization, persisted status constants, dashboard filter option constants, default/settings normalization, and legacy `ritz_*` localStorage migration keys.
- `price-sent-email.js` owns the client helper for calling the protected price-sent guest email/SMS notification API after ticket saves and summarizing its email, SMS, and Sona chat results.
- `price-sent-email-server.js` owns the server-side Resend template, delivery, retail price screenshot attachment, `priceSentGuestEmailEnabled` skip rule, successful-delivery ticket stamps for price-sent guest emails, and the disabled-by-default staff copy.
- `ticket-status-sms-server.js` owns shared server-side Quo delivery, E.164 validation, single/double-brace placeholder rendering, skip rules, and once-per-ticket/status delivery stamps for price-sent, payment-submitted, payment-verified, and booking-confirmed guest SMS; `price-sent-sms-server.js` preserves the price-sent adapter contract.
- `price-sent-notifications-server.js` owns independent dispatch of price-sent email and SMS delivery.
- `phone.js` owns shared E.164 phone normalization and validation.
- `sms-templates.js` owns fixed-ID normalization, legacy price-sent single-template migration, active-template selection, and validation for three price-sent templates and two templates for each later lifecycle status.
- `quote-alert-email-server.js` owns the server-side Resend template, active staff-recipient filtering, skip rules, and successful-delivery ticket stamp for new quote staff alerts.
- `payment-submitted-alert.js` owns the client helper for calling the payment-submitted staff alert API after ticket payment updates.
- `payment-submitted-alert-email-server.js` owns the server-side Resend template, active staff-recipient filtering, payment proof screenshot attachment, skip rules, and successful-delivery ticket stamp for payment-submitted staff alerts.
- `booking-request-hotel-alert.js` owns the client helper for calling the Booking Requests Hotel Alert API after payment-verification saves or updates.
- `booking-request-hotel-alert-email-server.js` owns the server-side Resend booking-request template, active hotel-recipient filtering, fixed `1609E` subject, skip rules, and successful-delivery ticket stamp for Booking Requests Hotel Alerts.
- `booking-confirmed-hotel-alert.js` owns the client helper for calling the Booking Confirmed Hotel Alert API after booking-confirmation saves or updates.
- `booking-confirmed-hotel-alert-email-server.js` owns the server-side Resend confirmation template, active hotel-recipient filtering, confirmation-number subject, skip rules, and successful-delivery ticket stamp for Booking Confirmed Hotel Alerts.
- `payment-submitted-notifications-server.js`, `payment-verified-notifications-server.js`, and `booking-confirmed-notifications-server.js` independently aggregate each status email and guest SMS result so one provider failure does not suppress the other delivery path.
- `StoreMigrator.jsx` owns one-time import of legacy browser-local reservation/settings data into Convex.
- `ui-preferences.js` owns browser-local UI preference fallback keys such as dashboard table column visibility before Convex dashboard preferences are available.
- `AuthContext.jsx` adapts Convex Auth state/actions to the app's existing `useAuth()` contract.
- `Providers.jsx` and `query-client.js` own app-wide client context providers outside Convex Auth.
- `calc.js` owns money formatting and reservation price/date calculations.
- `utils.js` owns shared utility helpers such as class-name composition.
- `defaults.js` also owns Sona's code-controlled display name, exact approved website opening message, adaptive SMS identity disclosure, and normalization over persisted legacy branding values.
- `sara-date-resolver.js` owns deterministic Hawaii-current-date, explicit guest-year preservation, next-future date/month inference, and December-to-January stay rollover before Sona tools execute.
- `sara-prompt.js` owns Sona's fixed identity, source hierarchy, Hawaii-relative date interpretation, exact-stay versus month-range availability behavior, required quote-intake fields including the referrer name behind a promoter or referral source, reservation-edit permissions and re-quote wording limits, booking/payment permissions, unsupported-action restraint, legal-Terms non-interpretation boundary, handoff rules, channel style, and prompt version; only an ambiguous phone/email contact match is a records conflict requiring handoff, while a repeat client stating a different acquisition source is an expected update.
- `sara-agent-server.js` owns the server-only OpenAI Responses tool loop, strict exact-stay and month-availability tool schemas, guest reservation-edit tool schemas limited to names, email, phone, and both stay dates, the quote-creation referrer-name gate that rejects a promoter or referral source before Convex is called, control-fenced tool execution, provider-confirmed deterministic first-SMS disclosure without truncating authorized payment instructions, deterministic channel-specific Terms presentation and acceptance retry messages, deterministic reservation-change confirmation and result messages, channel formatting, and agent-run completion.
- `sara-payment-instructions.js` owns deterministic immediate and repeat payment replies containing configured methods, the secure ticket link, and the staff-verification notice without model rewriting or SMS truncation.
- `sara-reservation-change.js` owns deterministic reservation-change confirmation, applied, cancelled, expired, unconfirmed, stale, and invalid replies plus the quote-failure message; these must state only CRM-derived dates, must never promise a price that has not been returned, and must never repeat internal quote-error detail to a guest. The date-change confirmation renders the full current and full requested stay from the pending change snapshot and proposed values, so one moved date still shows both ranges and a date label is never emitted without dates.
- `requote-notification-server.js` owns the post-`PRICE SENT` quote-ready and failed-quote conversation messages with their per-revision idempotency keys, consent-, allowlist-, and control-fenced SMS delivery through the Convex outbox, and re-sending the price email or price SMS after a contact-detail change on a priced ticket; quote-ready content renders the active price-sent SMS template verbatim with the same ticket and retail-screenshot URLs as the lifecycle SMS so web transcripts match the guest SMS text, and linked conversations are read through `conversations.getServiceContext` so web conversations without a guest session still receive their notifications.
- `quo-provider.js` owns the single dependency-free Quo provider message ID extraction contract shared by outbound sends and inbound webhook delivery receipts.
- `quo-server.js` owns the shared server-only Quo text transport, sender/recipient normalization, timeout, resolved `providerMessageId` on every successful send, and rejected-versus-ambiguous provider error classification.

## Local Contracts

- Treat Convex `tickets` and `settings` tables as the live persistence contract for reservation/settings data, including app name, global desktop table Columns-button visibility, public home page variant, quote webhook URL/enabled settings, email/SMS alert settings and staff/hotel recipients, `bookingConfirmedHotelAlertAttachments`, `reservationConfirmationNumber`, lifecycle `*SmsEnabled`, `*SmsTemplates`, `*SmsTemplateId`, and `*SmsSentAt` fields, email delivery stamps, and R2 object-key fields such as `paymentScreenshotKey` and `retailPriceScreenshotKey`.
- Booking-confirmed hotel email delivery requires a nonblank reservation confirmation number and must never substitute placeholder copy for a missing number.
- Treat legacy `ritz_*` localStorage keys as import-only compatibility contracts for existing browser data.
- Keep dashboard paginated ticket hook arguments aligned with `convex/tickets.ts` pagination and filter query args.
- Keep dashboard preference hooks aligned with `convex/dashboardPreferences.ts`; validate saved view mode, status filters, date filters, page size, and visible columns before writing them.
- Keep browser-only storage access guarded for server rendering where applicable.
- Keep R2 credentials server-only; client components must use API routes for signed payment proof, retail price screenshot, and booking-confirmed alert PDF upload URLs.
- Do not duplicate status, payment method, settings, or ticket schema constants in route or component files.
- `normalizePhone()` converts formatted 10-digit US/Canada numbers and 11-digit North American numbers beginning with `1` to persisted `+1` E.164 values while preserving already international `+` numbers.
- Use Convex transcripts and structured state as Sona's durable context; OpenAI Responses must use `store: false`, bounded history, bounded output, and no browser-provided model or system instructions.
- Select Sona's OpenAI model from the staff CRM override first, then `OPENAI_MODEL`, then the `gpt-5.6-luna` code default so an intentional CRM value takes effect without redeployment.
- Keep property facts in approved Knowledge or dynamic settings tools, Terms behind the priced-ticket gate, and payment instructions behind recorded Terms acceptance.
- Sona may offer or claim an operational action only when an available tool implements it and the tool call succeeds; hotel-controlled services must go to the hotel front desk or a human reservations specialist.
- A promoter or referral acquisition source hard-blocks quote creation without a real referrer name: validate it with `@/convex/acquisitionSource` at the tool boundary so the model receives one actionable rejection and asks the guest, never invent or placeholder the name, and call handoff when the guest cannot supply one.
- Broad calendar-month availability requests must use the month-availability tool and return its contiguous check-in/check-out ranges; do not require exact guest dates before showing those verified options.
- Sona must preserve the latest non-conflicting year explicitly supplied in guest date context; without one, resolve the next non-past Hawaii occurrence and December-to-January checkout rollover deterministically before availability or quote tools run. Do not ask for a year unless the guest supplied conflicting years.
- Keep the published Terms body outside model context. Model-authored text must not quote, summarize, paraphrase, explain, compare, or interpret that legal document; deterministic server copy owns its link and acceptance instructions while approved standalone policy FAQs remain available through Knowledge.
- Web transcript text never records Terms acceptance; current SMS presentations invite an explicit agree or accept reply, while deterministic Convex classification owns the approved phrase allowlist, case/whitespace/safe-trailing-punctuation normalization, rejection retries, and presentation-bound prior/legacy compatibility.
- Keep default/client payment methods instruction-free; configured instructions may leave the server only through a current Terms-hash and payable-ticket gate.
- Immediately after accepted web or SMS Terms, bypass model discretion and send the gated deterministic payment reply; later guest requests and repeated valid SMS acceptance may resend current instructions through the same deterministic formatter.
- Reservation-change confirmations and results bypass model discretion the same way: the server stages the pending change, writes the confirmation request, classifies the guest reply with the Convex allowlist, and owns the applied, cancelled, expired, stale, and invalid wording. Model text may summarize only what a successful `update_reservation` returned.
- A date-change confirmation always shows both full stay ranges, including when only one date moved; the agent server supplies them from the staged `ticketSnapshot` and `proposed` values rather than from the changed-field list.
- Quote-ready conversation messages are one per ticket and `quoteRevision`, render the active price-sent SMS template verbatim, must not be sent when Sona is paused or the conversation is closed, and must not duplicate a lifecycle price-sent SMS that already delivered for the same revision.
- Bump `SARA_PROMPT_VERSION` whenever Sona's permissions, deterministic boundaries, or identity wording change.
- Conversational SMS must use `lib/quo-server.js` and the Convex outbox; do not add another direct Quo transport.
- Every outbound Quo send must persist the `providerMessageId` that `quo-server.js` resolved, because delivery receipts are matched only by that value; extract provider message IDs exclusively through `quo-provider.js` so the send side and the webhook receipt side cannot drift apart.

## Work Guidance

- When changing persisted settings shapes, include migration/default handling near `normalizeSettings()`.
- Keep calculation logic deterministic and independent from React components.
- Keep auth behavior consistent with staff route guards in `app/(staff)/AGENTS.md`.
- Keep `quo-provider.js` free of imports so `lib/quo-provider.test.mjs` can transpile and load it under `node --test`.

## Verification

- Run `npm run build` after provider, auth, persistence, or calculation changes when feasible.
- Run `npm test` after changing Sona branding, prompt identity, or first-response behavior.
- Run `npm test` after changing Sona date/year resolution.
- Run `npm test` after changing Sona acquisition-source or referrer-name gating.
- Run `npm test` after changing Sona Terms presentation or acceptance handling.
- Run `npm test` after changing deterministic Sona payment-instruction formatting or delivery behavior.
- Run `npm test` after changing deterministic Sona reservation-change or quote-failure message wording.
- Run `npm test` after changing Quo provider message ID extraction, because an ID mismatch silently turns every delivery receipt into an unmatched provider event.

## Child DOX Index

- No child DOX files.
