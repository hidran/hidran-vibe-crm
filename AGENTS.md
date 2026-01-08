# Repository Guidelines

## Project Structure & Module Organization
`src/` holds product code: route-level pages in `src/pages`, composable UI in `src/components`, hooks in `src/hooks`, data/services in `src/services`, shared React contexts in `src/contexts`, and Supabase helpers in `src/integrations`. Tests live beside product flows in `/tests` (unit/property/component specs) with Playwright artifacts under `playwright-report/`. Database migrations and Row Level Security policies live in `/supabase`. Static docs stay in `/docs`, and Shadcn/Tailwind primitives sit in `src/components/ui`. Keep domain logic inside hooks/services so pages remain declarative shells.

## Build, Test, and Development Commands
- `npm install` – sync dependencies after cloning or pulling.
- `npm run dev` – Vite dev server at `http://localhost:5173`.
- `npm run build` / `npm run preview` – create and smoke-test the production bundle.
- `npm run lint` – ESLint (configured via `eslint.config.js`) for TypeScript, hooks, and Tailwind class ordering.
- `npm test`, `npm run test:watch`, `npm run test:ui` – Vitest suites, including property tests (`tests/organizations/*.property.test.ts`) and Testing Library specs. Run `npx playwright test` before shipping UI flows if Playwright is enabled locally.

## Coding Style & Naming Conventions
Use TypeScript strictly—avoid `any`, export shared interfaces from `src/types` or feature folders, and co-locate Zod schemas with their forms. Components are functional and typed (PascalCase filenames), hooks start with `use`, non-component helpers use `camelCase`, and constants use `UPPER_SNAKE_CASE`. Follow React Query patterns (`usePaginatedResource`, `useCreateResource`) and isolate Supabase calls inside `src/services` to keep pages DRY. Format with two-space indentation and rely on ESLint + editor formatting; keep Tailwind classes grouped by layout → color → state.

## Testing Guidelines
Write Vitest tests for every hook/service plus high-value pages, mirroring structure under `/tests`. Favor Testing Library for React behavior, fast-check for property-based verification (see existing organization stats specs), and stub Supabase via test helpers. When adding UI widgets, include accessibility assertions (`getByRole`, `findByText`). For end-to-end coverage, extend Playwright specs in `tests/e2e` if a feature spans multiple surfaces. New features should land with passing `npm test` and updated test specs documented in `docs/testing/TEST_SPECS.md`.

## Commit & Pull Request Guidelines
Follow Conventional Commit prefixes observed in history (`feat`, `fix`, `style`, `docs`, etc.) and keep subjects imperative: `feat(invoices): add pagination controls`. Branch names mirror intent (`feature/projects-pagination`). PRs must describe scope, screenshots or console output for UI/API changes, linked issues, Supabase migration notes, and explicit test evidence (`npm test`, Playwright runs). Highlight breaking changes or env variable additions in the description, and ensure docs in `/docs` reflect new behavior before requesting review.

## Supabase & Configuration Tips
Use the provided `.env.local` template plus the latest `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and `VITE_SUPABASE_PUBLISHABLE_KEY`. When a schema or RLS rule changes, update `/supabase/migrations` and regenerate typed definitions in `src/integrations/supabase/types`. Keep service-role operations out of the client bundle; instead, route privileged actions through Supabase Edge functions or serverless endpoints referenced in `docs/developer-guides/getting-started.md`.
