# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Location**: `/docs/CLAUDE.md`

## Documentation

All project documentation is located in the `/docs` folder:
- `/docs/CLAUDE.md` - This file, guidance for AI assistants
- `/docs/DRAG_DROP_IMPLEMENTATION.md` - Task drag and drop feature documentation
- `/docs/TASK_SUMMARY.md` - Summary of recent drag and drop implementation

## Development Commands

```bash
# Development server (runs on port 8080 by default)
npm run dev

# Build for production
npm run build

# Build for development (with dev mode flags)
npm run build:dev

# Preview production build
npm run preview

# Linting
npm run lint

# Testing
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Open Vitest UI dashboard
```

## Project Stack

**Frontend**
- React 18 with TypeScript
- Vite as build tool and dev server
- Tailwind CSS for styling
- shadcn-ui component library (built on Radix UI primitives)

**Backend & Data**
- Supabase for authentication and PostgreSQL database
- TanStack React Query (v5) for server state management
- React Hook Form + Zod for form validation

**Key Libraries**
- React Router v6 for routing
- @react-pdf/renderer for invoice PDF generation
- Recharts for dashboard analytics
- date-fns for date utilities
- Sonner for toast notifications
- next-themes for theme management

## Architecture

### Application Structure

The application follows a layered architecture with clear separation of concerns:

```
Browser → React Router → Auth Context → Protected Routes → Pages → Components → Hooks → Services → Supabase
```

### Directory Organization

- `/src/pages` - Route-level page components
- `/src/components` - Reusable React components, organized by feature
  - `/ui` - shadcn-ui base components
  - `/auth`, `/tasks`, `/projects`, `/clients`, `/invoices`, etc. - Feature-specific components
  - `/layout` - Layout components (AppSidebar, DashboardLayout)
- `/src/contexts` - React Context providers (AuthContext, ThemeContext)
- `/src/hooks` - Custom React hooks for data fetching and mutations
- `/src/services` - Business logic and Supabase API calls
- `/src/integrations/supabase` - Supabase client and auto-generated types
- `/src/lib` - Utility functions
- `/tests` - Test files mirroring the src structure

### Authentication & Authorization

- **AuthContext** provides user session and authentication state
- **ProtectedRoute** component guards authenticated routes
- **SuperadminRoute** component guards superadmin-only routes
- **useIsSuperadmin** hook checks if the current user has superadmin privileges

### Data Management Pattern

Each resource (clients, projects, tasks, invoices, organizations, users) follows this pattern:

**Custom Hooks** (`/src/hooks/use[Resource].ts`):
- `use[Resource]s()` - Fetch all items with React Query
- `use[Resource]()` - Fetch single item
- `useCreate[Resource]()` - Mutation for creation
- `useUpdate[Resource]()` - Mutation for updates
- `useDelete[Resource]()` - Mutation for deletion

**Service Layer** (`/src/services/supabase/[resource]Service.ts`):
- Encapsulates Supabase API calls
- Handles error management
- Returns typed data

**Auto-invalidation**: Mutations automatically invalidate related queries to keep UI synchronized.

### Organization Model

- Users belong to organizations (multi-tenancy)
- Superadmin users can manage multiple organizations
- Regular users are scoped to their organization
- Most resources (projects, tasks, clients, invoices) are organization-scoped

### Route Protection

Routes are organized as:
- Public: `/` (landing), `/auth` (login/signup)
- Protected (authenticated): `/dashboard`, `/projects`, `/tasks`, `/clients`, `/invoices`, `/users`
- Superadmin-only: `/organizations`

### Forms

Forms use:
- `react-hook-form` for form state
- `zod` for schema validation
- `@hookform/resolvers` to bridge the two
- shadcn-ui form components for UI

### Database Schema Notes

**Tasks**:
- Have a `position` field (number) for ordering within a status column
- Ordered by `position` first, then `created_at` (descending)
- Status field uses enum: `backlog`, `todo`, `in_progress`, `review`, `done`
- Priority field uses enum: `low`, `medium`, `high`, `urgent`

**Projects**:
- Belong to an organization and optionally a client
- Can have multiple tasks

**Invoices**:
- Have line items stored in `invoice_line_items` table
- Support PDF generation via @react-pdf/renderer

## Testing

**Framework**: Vitest with jsdom environment

**Test Organization**: `/tests` directory mirrors `/src` structure

**Test Types**:
- Unit tests for hooks and utilities
- Component tests using Testing Library
- Integration tests for features
- E2E tests using Playwright

**Running Individual Tests**:
```bash
# Run tests in a specific file
npm test -- src/hooks/useClients.test.tsx

# Run tests matching a pattern
npm test -- --grep "should fetch clients"
```

## Key Implementation Patterns

### Creating a New Resource Feature

1. Generate Supabase types (they auto-update from DB schema)
2. Create service in `/src/services/supabase/[resource]Service.ts`
3. Create custom hooks in `/src/hooks/use[Resource].ts`
4. Create page component in `/src/pages/[Resource].tsx`
5. Create form component in `/src/pages/[Resource]Form.tsx`
6. Add feature-specific components in `/src/components/[resource]/`
7. Add route in `/src/App.tsx`
8. Add navigation link in `/src/components/layout/AppSidebar.tsx`

### Supabase Type Generation

Types in `/src/integrations/supabase/types.ts` are auto-generated from the Supabase database schema. Do not manually edit this file.

### Path Aliases

The project uses `@/` as an alias for `/src/`. Example: `import { Button } from "@/components/ui/button"`

## Theme System

- Supports light/dark mode via `next-themes`
- Multiple color palettes: verdant, ocean, sunset, purple, rose, custom
- Theme settings persisted in localStorage
- Access via `useTheme()` hook from ThemeContext
