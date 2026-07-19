# Sara Chat

## Purpose

- Owns the guest-facing Sara AI concierge launcher and responsive conversation dialog used across public routes.

## Ownership

- `GuestChatWidget.jsx` owns transcript loading, optimistic guest messages, message submission, paused/handoff display, ticket links, accessibility, and mobile safe-area placement.

## Local Contracts

- Use only `/api/sara/chat` for conversation reads and writes; never call OpenAI or Convex Sara mutations from browser code.
- Render plain text, preserve guest input during network failures, and never collect card numbers, passwords, or banking credentials.
- Clearly display that Sara is AI for an independent private residence service and that human help is available.
- Hide the widget unless public settings enable `saraWebEnabled`.

## Work Guidance

- Keep the launcher above the public mobile navigation and the open dialog below global toast layers.
- Preserve keyboard submission, IME composition, focus handling, labeled controls, and `role="log"` transcript announcements.

## Verification

- Run `npm run build` after chat component or API-contract changes.

## Child DOX Index

- No child DOX files.
