# UI Primitives

## Purpose

- Owns shadcn-style reusable UI primitives, toast helpers, and low-level components used throughout the app.

## Ownership

- Files in this folder implement generic UI primitives backed by Radix UI, Tailwind classes, `class-variance-authority`, and helpers from `lib/utils.js`.
- `use-toast.jsx`, `toast.jsx`, and `toaster.jsx` own the current Radix toast stack; `sonner.jsx` owns the Sonner wrapper.

## Local Contracts

- Keep components generic and domain-neutral; reservation-specific behavior belongs outside `components/ui/`.
- Preserve exported component names and variant APIs unless all consumers are updated.
- Follow the existing shadcn JSX style from `components.json`: New York style, no TypeScript, CSS variables, lucide icons.

## Work Guidance

- Do not add app-specific copy, storage access, or route navigation here.
- Use `cn` from `lib/utils.js` for class composition.

## Verification

- Run `npm run build` after changing primitive exports or variants when feasible.

## Child DOX Index

- No child DOX files.
