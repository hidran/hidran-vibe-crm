# Project Structure

## Directory Organization

```
src/
├── components/          # React components organized by feature
│   ├── auth/           # Authentication components (ProtectedRoute)
│   ├── clients/        # Client management dialogs and forms
│   ├── dashboard/      # Dashboard-specific components (StatCard, RevenueChart)
│   ├── layout/         # Layout components (Sidebar, Header)
│   ├── projects/       # Project management dialogs and forms
│   ├── tasks/          # Task management (KanbanBoard, TaskDialog)
│   └── ui/             # shadcn/ui components (Button, Dialog, Form, etc.)
├── contexts/           # React contexts (AuthContext)
├── hooks/              # Custom React hooks
│   ├── useClients.ts   # Client CRUD operations
│   ├── useProjects.ts  # Project CRUD operations
│   ├── useTasks.ts     # Task CRUD operations
│   ├── useOrganization*.ts  # Organization data hooks
│   └── use-*.ts        # UI utility hooks
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client and generated types
├── lib/                # Utility functions (utils.ts)
├── pages/              # Route-level page components
├── test/               # Test files (property-based and integration tests)
├── App.tsx             # Root application component
└── main.tsx            # Application entry point

supabase/
└── migrations/         # Database migration SQL files

scripts/                # Utility scripts (setup, verification)
docs/                   # Documentation files
```

## Architectural Patterns

### Data Fetching Pattern

Use custom hooks that wrap TanStack Query for all data operations:

```typescript
// Pattern: useEntity.ts exports multiple hooks
export const useClients = (orgId) => useQuery(...)      // Fetch list
export const useClient = (id) => useQuery(...)          // Fetch single
export const useCreateClient = () => useMutation(...)   // Create
export const useUpdateClient = () => useMutation(...)   // Update
export const useDeleteClient = () => useMutation(...)   // Delete
```

- Query keys follow pattern: `["entity", id/orgId]`
- Mutations automatically invalidate related queries
- All hooks handle organization-scoped data

### Component Pattern

Dialog-based forms for CRUD operations:

```typescript
// Pattern: EntityDialog.tsx
interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  entity?: Entity | null;  // Present for edit, null for create
}
```

- Use React Hook Form with Zod schema validation
- Show loading states with `isPending` from mutations
- Toast notifications for success/error feedback
- Reset form on open/close

### Type Safety

- Import types from `@/integrations/supabase/types`
- Use `Tables<"table_name">` for entity types
- Use `TablesInsert<"table_name">` for create operations
- Use `TablesUpdate<"table_name">` for update operations

### Routing & Auth

- All authenticated routes wrapped in `<ProtectedRoute>`
- `AuthContext` provides user and organization data
- Routes defined in `App.tsx` using React Router v6

## File Naming Conventions

- Components: PascalCase (e.g., `ClientDialog.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useClients.ts`)
- Pages: PascalCase (e.g., `Dashboard.tsx`)
- Tests: Match source file with `.test.tsx` or `.property.test.ts` suffix
- UI components: kebab-case (e.g., `alert-dialog.tsx`)

## Import Alias

Always use `@/` path alias for imports within `src/`:

```typescript
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/useClients";
```

## Testing Structure

- Unit tests: Co-located with components (e.g., `StatCard.test.tsx`)
- Property-based tests: In `src/test/` directory
- Test setup and mocks: `src/test/setup.ts`
- Property tests use `fast-check` library for generative testing
- Tests have 30-second timeout for database operations
