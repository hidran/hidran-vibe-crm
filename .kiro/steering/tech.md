# Tech Stack

## Core Technologies

- **Build Tool**: Vite 5.4+ with SWC for fast compilation
- **Framework**: React 18.3+ with TypeScript 5.8+
- **Routing**: React Router DOM v6
- **State Management**: TanStack Query (React Query) v5 for server state
- **Backend**: Supabase (PostgreSQL database, Auth, RLS)
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4+ with tailwindcss-animate
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Testing**: Vitest with React Testing Library and fast-check for property-based testing

## Key Dependencies

- `@supabase/supabase-js`: Database and auth client
- `@tanstack/react-query`: Async state management
- `react-hook-form` + `@hookform/resolvers` + `zod`: Form handling and validation
- `date-fns`: Date manipulation
- `class-variance-authority` + `clsx` + `tailwind-merge`: Utility class management
- `sonner`: Toast notifications

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 8080
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint

# Testing
npm test                 # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Run tests with UI
```

## Environment Variables

Required in `.env.local`:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon/public key

## TypeScript Configuration

- Strict mode is **disabled** for flexibility
- Path alias: `@/*` maps to `./src/*`
- `noImplicitAny`, `noUnusedParameters`, `noUnusedLocals`, `strictNullChecks` are all disabled
- `skipLibCheck` and `allowJs` are enabled

## Development Server

- Host: `::` (IPv6, listens on all interfaces)
- Port: `8080`
- Hot Module Replacement (HMR) enabled via Vite
