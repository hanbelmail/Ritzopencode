# Sara Chat

## Purpose

- Owns the guest-facing Sara AI concierge launcher and responsive conversation dialog used across public routes.

## Ownership

- `GuestChatWidget.jsx` owns transcript loading, optimistic guest messages, message submission, paused/handoff display, ticket links, structured Terms acceptance controls, accessibility, and mobile safe-area placement.

## Local Contracts

- Use only `/api/sara/chat` for conversation reads and writes; never call OpenAI or Convex Sara mutations from browser code.
- Render plain text, preserve guest input during network failures, and never collect card numbers, passwords, or banking credentials.
- Keep arbitrary transcript URLs as plain text; only the server-described immutable Terms action may render its trusted clickable link, exact agreement label, checkbox, button, and accepted timestamp.
- Ordinary typed transcript messages never accept Terms; web acceptance requires the server-described checkbox and button action.
- Open quote ticket links in a new browser tab so the active chat remains available.
- Clearly display that Sara is AI for an independent private residence service and that human help is available.
- Hide the widget unless public settings enable `saraWebEnabled`.

## Work Guidance

- Keep the launcher above the public mobile navigation and the open dialog below global toast layers.
- Preserve keyboard submission, IME composition, focus handling, labeled controls, and `role="log"` transcript announcements.

## Verification

- Run `npm run build` after chat component or API-contract changes.

## Child DOX Index

- No child DOX files.
