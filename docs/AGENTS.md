# Repository Guidelines

## Project Structure & Module Organization
The Vite + React app lives in `src/` with route views in `pages`, shadcn-ui components in `components`, contexts/hooks in `contexts` and `hooks`, and integration helpers in `integrations` and `lib`. Static assets belong in `public/`, Supabase SQL plus helper scripts in `supabase/` and `scripts/` (follow `SETUP_INSTRUCTIONS.md` when seeding), and builds output to `dist/`. Tests stay feature-focused under `tests/` with shared setup in `tests/setup.ts`.

## Build, Test, and Development Commands
- `npm install` – sync dependencies.
- `npm run dev` – Vite dev server at `http://localhost:5173`.
- `npm run build` / `npm run build:dev` – production or development bundles sent to `dist/`.
- `npm run preview` – serve the compiled bundle locally.
- `npm run lint` – ESLint + typescript-eslint React Hooks rules.
- `npm test`, `npm run test:watch`, `npm run test:ui` – Vitest batch, watch, or UI dashboard.
- `npx playwright test` – execute Playwright specs under `tests/**`.

## Coding Style & Naming Conventions
Use TypeScript function components and hooks, naming components with PascalCase and utilities with camelCase; keep folders/routes kebab-case. Styling should leverage Tailwind and shadcn tokens—extend `tailwind.config.ts` before adding ad-hoc CSS. Centralize Supabase access in hooks or contexts. Run `npm run lint` before commits; there is no Prettier file, so follow the existing two-space formatting in `src/`.

## Testing Guidelines
Vitest + Testing Library cover units/integrations (`*.test.ts[x]`), Playwright handles end-to-end journeys (`*.spec.ts`), and fast-check drives property suites (`*.property.test.ts`). Place specs in the relevant feature directory (e.g., `tests/invoices/invoice-calculation.property.test.ts`) and load `tests/setup.ts` for shared mocks. Target hooks that wrap Supabase queries or permission logic, adding regression suites when RLS SQL changes. Use `npm test -- tests/<feature>` for targeted runs.

## Commit & Pull Request Guidelines
Commit summaries should stay scoped and imperative (`Improve org combobox default`); avoid vague entries like `Changes`. Reference issues or TASK IDs when available. Pull requests need a brief narrative, before/after screenshots for UI shifts, test results (`npm test`, `npx playwright test` if touched), and any Supabase or script commands used (`supabase db reset`, `scripts/setup-superadmin.sh`). Call out new environment variables or migrations so reviewers can reproduce safely.

## Security & Configuration Tips
Keep Supabase keys and OAuth secrets in ignored `.env` files and never push them. Reseed data through `SETUP_INSTRUCTIONS.md` and the helper scripts so the fake organizations and superadmin account stay correct. Review SQL changes under `supabase/` before deployment and rerun `supabase db reset` whenever migrations shift.
