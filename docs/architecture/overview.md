# Architecture Overview

Vibe CRM is a modern, multi-tenant web application designed with clear separation of concerns and scalable patterns.

## System Architecture

```
┌─────────────────────────────────────────┐
│        Browser (React Application)      │
│  - React 18 with TypeScript             │
│  - Tailwind CSS + shadcn/ui components  │
│  - React Router for navigation          │
└──────────────┬──────────────────────────┘
               │ HTTP/JSON (REST API)
┌──────────────▼──────────────────────────┐
│      Frontend State Management          │
│  - TanStack Query (server state)        │
│  - React Context (UI state)             │
│  - React Hook Form (form state)         │
└──────────────┬──────────────────────────┘
               │ Custom Hooks & Services
┌──────────────▼──────────────────────────┐
│      Supabase Client Library            │
│  - Authentication                       │
│  - Real-time subscriptions              │
│  - RESTful API to PostgreSQL            │
└──────────────┬──────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────┐
│   Supabase Backend (Managed Service)    │
│  - PostgreSQL Database                  │
│  - Row-Level Security (RLS)             │
│  - Authentication                       │
│  - Real-time Database Changes           │
└─────────────────────────────────────────┘
```

## Directory Structure

### `/src/pages`
**Purpose**: Route-level page components, one per major route

```
pages/
├── Auth.tsx              # Login/signup pages
├── Dashboard.tsx         # Main dashboard overview
├── Clients.tsx           # Clients list page
├── ClientForm.tsx        # Create/edit client
├── Projects.tsx          # Projects list
├── ProjectForm.tsx       # Create/edit project
├── Tasks.tsx             # Tasks board
├── TaskForm.tsx          # Create/edit task
├── Invoices.tsx          # Invoices list
├── InvoiceForm.tsx       # Create/edit invoice
├── Users.tsx             # Team members
├── UserForm.tsx          # Create/edit user
├── Organizations.tsx     # Organization management (superadmin)
└── NotFound.tsx          # 404 page
```

Each page:
- Imports custom hooks for data fetching
- Renders feature-specific components
- Uses React Router for navigation
- Protected by route guards (auth, permissions)

### `/src/components`
**Purpose**: Reusable React components organized by feature

```
components/
├── ui/                   # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   └── [30+ other UI components]
├── layout/               # Layout structure
│   ├── DashboardLayout.tsx    # Main layout wrapper
│   ├── AppSidebar.tsx         # Navigation sidebar
│   └── Header.tsx             # Top header
├── auth/                 # Authentication components
│   ├── ProtectedRoute.tsx
│   └── SuperadminRoute.tsx
├── clients/              # Client-related features
│   ├── ClientsDataTable.tsx
│   └── ClientDialog.tsx
├── projects/             # Project-related features
│   ├── ProjectsDataTable.tsx
│   └── ProjectCard.tsx
├── tasks/                # Task management
│   ├── TaskBoard.tsx
│   └── TaskCard.tsx
├── invoices/             # Invoice features
│   ├── InvoicesDataTable.tsx
│   ├── InvoiceForm.tsx
│   └── pdf/              # PDF generation
├── dashboard/            # Dashboard widgets
│   ├── StatsCards.tsx
│   └── RevenueChart.tsx
└── [other features]/
```

### `/src/hooks`
**Purpose**: Custom React hooks for data fetching and mutations

Follows consistent pattern for each resource:

```typescript
// Example: useClients.ts
export const useClients = (organizationId?: string) => {
  // useQuery for fetching data
};

export const useClient = (clientId?: string) => {
  // useQuery for single item
};

export const useCreateClient = () => {
  // useMutation for creation
};

export const useUpdateClient = () => {
  // useMutation for updates
};

export const useDeleteClient = () => {
  // useMutation for deletion
};
```

Key hooks:
- `useAuth()` - User session and auth state
- `useOrganization()` - Current organization context
- `useIsSuperadmin()` - Permission checking
- `useClients()` - Client data management
- `useProjects()` - Project data management
- `useTasks()` - Task data management
- `useInvoices()` - Invoice data management
- `useUsers()` - User/team management

### `/src/services`
**Purpose**: Business logic and Supabase API calls

```
services/
├── supabase/
│   ├── supabaseService.ts     # Base class for error handling
│   ├── projectService.ts      # Project queries
│   ├── taskService.ts         # Task queries
│   ├── invoiceService.ts      # Invoice queries
│   └── [other services]
```

Services encapsulate:
- Supabase API calls
- Error handling with logging
- Type safety (auto-generated types)
- Query optimization

### `/src/contexts`
**Purpose**: React Context providers for global state

```
contexts/
├── AuthContext.tsx           # User session and authentication
├── ThemeContext.tsx          # Light/dark mode, color palettes
└── OrganizationContext.tsx   # (if needed) Organization switching
```

### `/src/integrations`
**Purpose**: External service integrations

```
integrations/
├── supabase/
│   ├── client.ts             # Supabase client initialization
│   └── types.ts              # Auto-generated TypeScript types
```

### `/src/lib`
**Purpose**: Utility functions and helpers

```
lib/
├── utils.ts                  # General utilities (cn, cn, etc.)
├── validation.ts             # Zod schemas for validation
├── constants.ts              # App constants and enums
└── [other utilities]
```

## Data Flow

### Example: Fetching and Displaying Clients

```
1. User navigates to /clients
                ↓
2. Clients page component loads
   import { useClients } from "@/hooks/useClients"
                ↓
3. Hook uses TanStack Query
   useQuery({
     queryKey: ["clients", organizationId],
     queryFn: () => supabase.from("clients").select()
   })
                ↓
4. TanStack Query manages:
   - Caching data in memory
   - Deduplication of requests
   - Automatic background refetching
   - Error handling & retries
                ↓
5. Component renders ClientsDataTable
   - Displays loading state
   - Shows error if failed
   - Renders data in table
                ↓
6. User clicks "Create Client"
   - Modal/form opens
   - Form uses React Hook Form + Zod
                ↓
7. User submits form
   - useCreateClient() mutation fires
   - Supabase inserts record
   - Mutation invalidates query cache
                ↓
8. TanStack Query auto-refetches clients
   - UI updates automatically
   - Success toast notification shown
```

## State Management Strategy

### Server State (TanStack Query)
**What**: Data from API/database
**How**: TanStack Query handles caching, fetching, syncing
**When to use**: Fetching lists, single items, mutations

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["clients", organizationId],
  queryFn: fetchClients,
});
```

### UI State (React Context)
**What**: Global UI state (auth, theme, organization)
**How**: React Context provides to entire app
**When to use**: Auth status, theme, current organization

```typescript
const { user, loading } = useAuth();
```

### Form State (React Hook Form)
**What**: Form field values and validation
**How**: React Hook Form + Zod
**When to use**: Creating/editing records

```typescript
const form = useForm({ resolver: zodResolver(schema) });
```

## Component Patterns

### Page Component
```typescript
// src/pages/Clients.tsx
import { useClients } from "@/hooks/useClients";
import { useOrganization } from "@/hooks/useOrganization";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ClientsDataTable } from "@/components/clients/ClientsDataTable";

export default function ClientsPage() {
  const { organization } = useOrganization();
  const { data: clients = [], isLoading } = useClients(organization?.id);

  return (
    <DashboardLayout title="Clients">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <ClientsDataTable clients={clients} />
      )}
    </DashboardLayout>
  );
}
```

### Data-Fetching Hook
```typescript
// src/hooks/useClients.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useClients = (organizationId?: string) => {
  return useQuery({
    queryKey: ["clients", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
};
```

### Mutation Hook
```typescript
// src/hooks/useClients.ts
export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(client)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["clients", data.organization_id],
      });
    },
  });
};
```

## Route Structure

```
/                          # Landing page
/auth                      # Login/signup
/dashboard                 # Main dashboard
/clients                   # Clients list
/clients/new               # Create client
/clients/:id               # Edit client
/projects                  # Projects list
/projects/new              # Create project
/projects/:id              # Edit project
/tasks                     # Tasks board
/tasks/new                 # Create task
/tasks/:id                 # Edit task
/invoices                  # Invoices list
/invoices/new              # Create invoice
/invoices/:id              # View/edit invoice
/users                     # Team members
/users/new                 # Invite user
/users/:id                 # Edit user
/organizations             # Org management (superadmin only)
```

Protected by route guards:
- `<ProtectedRoute>` - Requires authentication
- `<SuperadminRoute>` - Requires superadmin role
- `<RequireOrganization>` - Requires organization selected

## Key Design Decisions

### 1. **TanStack Query for Server State**
- Automatic caching and synchronization
- Built-in loading/error states
- Query invalidation on mutations
- Reduces boilerplate vs manual useState

### 2. **React Hook Form + Zod**
- Type-safe form validation
- Better performance (minimal re-renders)
- Elegant error handling
- Works well with shadcn/ui forms

### 3. **Supabase for Backend**
- Managed PostgreSQL with built-in auth
- Row-Level Security (RLS) for multi-tenancy
- Real-time subscriptions
- Auto-generated TypeScript types

### 4. **Feature-Organized Components**
- Components grouped by feature (clients/, tasks/, etc.)
- Easier to find related components
- Scales better than flat structure

### 5. **Custom Hooks for Logic**
- Encapsulates data fetching pattern
- Reusable across multiple components
- Easier to test
- Clear API surface

## Authentication Flow

```
User visits app
         ↓
Check AuthContext (user session)
         ↓
Session exists?
    Yes ↓         ↓ No
 Load app    Show login
    ↓
User logs in with email/password
    ↓
Supabase authenticates
    ↓
Session created (JWT in localStorage)
    ↓
AuthContext notified
    ↓
App navigates to dashboard
```

## Multi-Tenancy Design

Each user belongs to one or more organizations. Data is isolated via:

1. **Database level**: RLS policies enforce `organization_id` filtering
2. **Application level**: useOrganization hook provides context
3. **Query level**: Queries filter by `organization_id`

Superadmin users bypass organization filtering to see all data.

## Error Handling

Errors are handled at multiple levels:

1. **Service Level**: SupabaseService base class logs errors
2. **Hook Level**: useQuery/useMutation capture and expose errors
3. **Component Level**: Components show error UI or toast notifications
4. **Global Level**: Error boundary can catch React errors

## Performance Optimizations

1. **Query Caching**: TanStack Query caches data in memory
2. **Query Deduplication**: Multiple identical queries run once
3. **Lazy Loading**: Pages/images loaded on demand
4. **Code Splitting**: Routes lazy-loaded with React.lazy
5. **RLS Policies**: Database filters data before sending
6. **Indexes**: Database indexes optimize common queries

## Security

1. **Authentication**: Supabase manages user sessions with JWTs
2. **Row-Level Security**: RLS policies enforce data access
3. **HTTPS**: All communication encrypted
4. **Input Validation**: Zod validates all form inputs
5. **Type Safety**: TypeScript catches many errors at build time

---

See also:
- [Multi-Tenant Architecture](./multi-tenancy.md)
- [Authentication & Permissions](./auth-permissions.md)
- [Database Schema](./database.md)
