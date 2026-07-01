# DOX framework

## Purpose

- Next.js 15 reservations app for Ritz-Carlton private room quotes, public ticket lookup, staff reservation management, and Convex Auth-backed staff authentication.
- Source is JavaScript/JSX with the App Router, Tailwind CSS, shadcn-style UI primitives, Convex backend files, Convex Auth, and Convex-backed reservation/settings persistence.
- Generated outputs and installed dependencies are present in the workspace but are not source-of-truth work areas.

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it
- Keep durable source changes in `app/`, `components/`, `lib/`, `convex/`, `hooks/`, root config files, or `public/` if assets are added.
- Do not edit `.next/`, `.next-build/`, or `node_modules/` as source; regenerate them through the relevant toolchain when needed.

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

## Work Guidance

- Use `@/` imports for project paths, matching `jsconfig.json`.
- Preserve the current JavaScript/JSX file style; do not introduce TypeScript unless explicitly requested.
- Treat `lib/store.js` constants and Convex tables as reservation/settings data contracts, including the public home page variant, email alert settings, email delivery stamps, and R2 object-key fields such as `paymentScreenshotKey` and `retailPriceScreenshotKey`; legacy `ritz_*` localStorage keys are read only for one-time browser data migration.
- Keep public guest flows, staff-authenticated flows, reusable components, and storage/business logic separated by their owning child DOX files.
- `middleware.js` protects staff routes, including `/email-dashboard`, with Convex Auth, skips automatic Convex Auth `code` handling on `/reset-password` so password-reset links keep their verification code, and allows protected API access for `/api/tickets(.*)` and `/api/retail-price-screenshot/upload-url` through either Convex Auth or a server-side `N8N_API_KEY` sent as `Authorization: Bearer <key>` or `x-api-key`.

## Verification

- Use `npm run build` for production build verification when behavior or routing changes are made.
- `npm run lint` exists in `package.json`, but this Next.js 15 project may require lint script maintenance before it is a reliable check.

## Child DOX Index

- `app/AGENTS.md` owns App Router layouts, pages, route groups, global CSS, auth pages, and not-found behavior.
- `components/AGENTS.md` owns reusable React components outside route files, including layouts, forms, tickets, ticket preview/payment, home quote form, and auth helpers.
- `convex/AGENTS.md` owns Convex backend configuration, schema, HTTP routes, and Convex Auth provider setup.
- `lib/AGENTS.md` owns shared providers, auth context, Convex-backed store hooks, legacy localStorage migration helpers, calculations, app params, query client setup, and utilities.
- Root owns `middleware.js`, `hooks/`, `public/`, root config files, package manifests, and workspace-level generated/ignored directories unless a child DOX is later added; `public/api-documentation.html` is the static custom App Router API reference and ticket workflow tutorial.
- `.next/`, `.next-build/`, and `node_modules/` are generated or installed artifacts and are not editable DOX domains.
