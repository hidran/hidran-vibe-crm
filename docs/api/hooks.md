# Custom Hooks API Reference

Custom hooks in Vibe CRM encapsulate data fetching, mutations, and state management logic. This guide documents all available hooks.

## Pattern Overview

Each resource follows a consistent pattern with hooks for:
- **Reading data**: `use[Resource]`, `use[Resource]s`
- **Creating**: `useCreate[Resource]`
- **Updating**: `useUpdate[Resource]`
- **Deleting**: `useDelete[Resource]`

### Example Hook Usage

```typescript
// Fetch all clients for organization
const { data: clients, isLoading, error } = useClients(organizationId);

// Create new client
const { mutate: createClient, isPending } = useCreateClient();

// Update existing client
const { mutate: updateClient } = useUpdateClient();

// Delete client
const { mutate: deleteClient } = useDeleteClient();
```

## Authentication Hooks

### useAuth

Provides access to current user session and authentication methods.

**Location**: `src/hooks/useAuth.ts` (in AuthContext)

```typescript
const { user, session, loading, signOut } = useAuth();
```

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current authenticated user |
| `session` | `Session \| null` | Current session object |
| `loading` | `boolean` | Loading state during auth check |
| `signOut` | `() => Promise<void>` | Sign out the user |

**Example**:
```typescript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Checking auth...</div>;
  if (!user) return <div>Please log in</div>;

  return (
    <div>
      Welcome, {user.email}!
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
```

### useIsSuperadmin

Check if current user has superadmin privileges.

**Location**: `src/hooks/useIsSuperadmin.ts`

```typescript
const { data: isSuperadmin, isLoading } = useIsSuperadmin();
```

**Returns**: `{ data: boolean, isLoading: boolean, error: Error | null }`

**Example**:
```typescript
function ManageOrganizations() {
  const { data: isSuperadmin } = useIsSuperadmin();

  if (!isSuperadmin) {
    return <div>Access denied</div>;
  }

  return <OrganizationList />;
}
```

## Organization Hooks

### useOrganization

Get the currently selected organization.

**Location**: `src/hooks/useOrganization.ts`

```typescript
const { organization, isLoading } = useOrganization();
```

**Returns**:
```typescript
{
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: "free" | "professional" | "business";
    created_at: string;
  } | null,
  isLoading: boolean
}
```

**Example**:
```typescript
const { organization } = useOrganization();

if (!organization) {
  return <RequireOrganization />;
}

return (
  <div>
    <h1>{organization.name}</h1>
    <p>Plan: {organization.plan}</p>
  </div>
);
```

### useOrganizations

Fetch all organizations (superadmin only).

**Location**: `src/hooks/useOrganizations.ts`

```typescript
const { data: organizations = [], isLoading } = useOrganizations(enabled);
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `enabled` | `boolean` | Enable/disable the query |

**Returns**: TanStack Query result with organizations array

**Example**:
```typescript
const { data: isSuperadmin } = useIsSuperadmin();
const { data: orgs } = useOrganizations(!!isSuperadmin);

return (
  <select>
    {orgs.map(org => (
      <option key={org.id} value={org.id}>{org.name}</option>
    ))}
  </select>
);
```

### useOrganizationStats

Get statistics for current organization.

**Location**: `src/hooks/useOrganizationStats.ts`

```typescript
const { data: stats, isLoading } = useOrganizationStats(organizationId);
```

**Returns**:
```typescript
{
  organization_id: string;
  client_count: number;
  project_count: number;
  task_count: number;
  invoice_count: number;
  total_revenue: number;
}
```

**Example**:
```typescript
const { organization } = useOrganization();
const { data: stats } = useOrganizationStats(organization?.id);

return (
  <div>
    <StatsCard title="Clients" value={stats?.client_count} />
    <StatsCard title="Projects" value={stats?.project_count} />
    <StatsCard title="Tasks" value={stats?.task_count} />
    <StatsCard title="Invoices" value={stats?.invoice_count} />
  </div>
);
```

## Client Hooks

### useClients

Fetch all clients for an organization.

**Location**: `src/hooks/useClients.ts`

```typescript
const { data: clients = [], isLoading, error } = useClients(organizationId);
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `organizationId` | `string \| undefined` | Filter by organization |

**Returns**: TanStack Query result with clients array

**Example**:
```typescript
const { organization } = useOrganization();
const { data: clients, isLoading } = useClients(organization?.id);

if (isLoading) return <Skeleton />;

return <ClientList clients={clients} />;
```

### useClient

Fetch a single client by ID.

**Location**: `src/hooks/useClients.ts`

```typescript
const { data: client, isLoading } = useClient(clientId);
```

### useCreateClient

Create a new client.

**Location**: `src/hooks/useClients.ts`

```typescript
const { mutate: createClient, isPending } = useCreateClient();
```

**Mutation function signature**:
```typescript
createClient({
  name: string;
  email: string;
  phone?: string;
  address?: string;
  organization_id: string;
})
```

**Example**:
```typescript
const { mutate: createClient, isPending } = useCreateClient();

const handleSubmit = (formData) => {
  createClient({
    ...formData,
    organization_id: organization.id,
  }, {
    onSuccess: () => {
      toast.success("Client created");
      navigate("/clients");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
```

### useUpdateClient

Update an existing client.

**Location**: `src/hooks/useClients.ts`

```typescript
const { mutate: updateClient, isPending } = useUpdateClient();
```

**Example**:
```typescript
const { mutate: updateClient } = useUpdateClient();

updateClient({
  id: client.id,
  name: "New Name",
  email: "new@example.com",
});
```

### useDeleteClient

Delete a client.

**Location**: `src/hooks/useClients.ts`

```typescript
const { mutate: deleteClient, isPending } = useDeleteClient();
```

**Example**:
```typescript
const { mutate: deleteClient } = useDeleteClient();

handleDelete = () => {
  deleteClient({
    id: client.id,
    organizationId: client.organization_id,
  });
};
```

## Project Hooks

### useProjects

Fetch all projects for organization.

```typescript
const { data: projects = [], isLoading } = useProjects(organizationId, options);
```

**Options**:
```typescript
{
  clientId?: string;      // Filter by client
  status?: string;        // Filter by status
  priority?: string;      // Filter by priority
  sortBy?: string;        // Sort field
  sortOrder?: "asc" | "desc";
  limit?: number;         // Results per page
  offset?: number;        // Pagination offset
}
```

### useProject

Fetch single project.

```typescript
const { data: project } = useProject(projectId);
```

### useCreateProject

Create project.

```typescript
const { mutate: createProject } = useCreateProject();

createProject({
  name: string;
  description?: string;
  client_id?: string;
  organization_id: string;
  status: "backlog" | "active" | "completed" | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
});
```

### useUpdateProject, useDeleteProject

Update and delete projects.

## Task Hooks

### useTasks

Fetch all tasks for organization or project.

```typescript
const { data: tasks = [] } = useTasks(organizationId, projectId);
```

### useTask

Fetch single task with details.

```typescript
const { data: task } = useTask(taskId);
```

### useCreateTask

Create task.

```typescript
const { mutate: createTask } = useCreateTask();

createTask({
  title: string;
  description?: string;
  project_id: string;
  organization_id: string;
  status: "backlog" | "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to?: string;
  due_date?: string;
  position?: number;
});
```

### useUpdateTask

Update task (including status, position for drag-and-drop).

```typescript
const { mutate: updateTask } = useUpdateTask();

// Update single field
updateTask({ id: taskId, title: "New title" });

// Update position (for drag-and-drop)
updateTask({
  id: taskId,
  status: "in_progress",
  position: 2
});
```

### useDeleteTask

Delete task.

## Invoice Hooks

### useInvoices

Fetch all invoices for organization.

```typescript
const { data: invoices = [] } = useInvoices(organizationId, filters);
```

**Filters**:
```typescript
{
  status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  clientId?: string;
  startDate?: string;
  endDate?: string;
}
```

### useInvoice

Fetch single invoice with line items.

```typescript
const { data: invoice } = useInvoice(invoiceId);

// Invoice structure
{
  id: string;
  invoice_number: string;
  client_id: string;
  organization_id: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  created_at: string;
  invoice_line_items: LineItem[];
}
```

### useCreateInvoice

Create invoice with line items.

```typescript
const { mutate: createInvoice } = useCreateInvoice();

createInvoice({
  client_id: string;
  organization_id: string;
  due_date: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
  }[];
});
```

### useUpdateInvoice

Update invoice (status, due date, etc).

### useDeleteInvoice

Delete invoice.

## User Hooks

### useUsers

Fetch all users in organization.

```typescript
const { data: users = [] } = useUsers(organizationId);
```

### useUser

Fetch single user.

```typescript
const { data: user } = useUser(userId);
```

### useCreateUser

Invite user to organization.

```typescript
const { mutate: createUser } = useCreateUser();

createUser({
  email: string;
  organization_id: string;
  role: "member" | "admin" | "owner";
});
```

### useUpdateUser

Update user role or settings.

### useDeleteUser

Remove user from organization.

## Revenue Hooks

### useRevenueData

Fetch revenue data for dashboard charts.

**Location**: `src/hooks/useRevenueData.ts`

```typescript
const { data: revenueData, isLoading } = useRevenueData(organizationId);
```

**Returns**: Array of monthly revenue data
```typescript
[
  {
    month: "Jan";
    revenue: 12500;
    invoices: 5;
  },
  // ... more months
]
```

**Example**:
```typescript
const { data: revenueData } = useRevenueData(organization?.id);

return (
  <RevenueChart
    data={revenueData}
    type="revenue"
  />
);
```

## Utility Hooks

### useToast

Show toast notifications (from shadcn/ui).

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Success",
  description: "Client created successfully",
  variant: "default",
});

// Error toast
toast({
  title: "Error",
  description: error.message,
  variant: "destructive",
});
```

## Query Patterns

### Dependent Queries

```typescript
// First fetch organization
const { organization } = useOrganization();

// Then fetch clients (depends on organization)
const { data: clients } = useClients(organization?.id);
```

### Query Invalidation

When a mutation succeeds, related queries are automatically invalidated:

```typescript
useCreateClient() // Automatically invalidates useClients query
useUpdateTask()   // Automatically invalidates useTasks query
```

To manually invalidate:

```typescript
const queryClient = useQueryClient();

queryClient.invalidateQueries({
  queryKey: ["clients", organizationId],
});
```

## Error Handling

All hooks return error state from TanStack Query:

```typescript
const { data, isLoading, error } = useClients(orgId);

if (error) {
  return <ErrorBanner message={error.message} />;
}
```

For mutations:

```typescript
const { mutate, isPending, error } = useCreateClient();

if (error) {
  console.error("Failed to create:", error);
}
```

## Best Practices

1. **Always check enabled state**: Queries with undefined dependencies won't run
   ```typescript
   const { data: clients } = useClients(organizationId); // Won't fetch if undefined
   ```

2. **Use mutations with callbacks for complex flows**:
   ```typescript
   createClient(data, {
     onSuccess: () => { /* redirect, etc */ },
     onError: (error) => { /* show error UI */ },
   });
   ```

3. **Let TanStack Query handle caching**: Don't manually cache data
   ```typescript
   // ✓ Good - Query is cached automatically
   const { data: clients } = useClients(orgId);

   // ✗ Avoid - Manual caching is error-prone
   const [clients, setClients] = useState([]);
   ```

4. **Use loading and error states consistently**:
   ```typescript
   if (isLoading) return <Skeleton />;
   if (error) return <ErrorUI />;
   return <DataUI data={data} />;
   ```

---

See also:
- [Supabase Client](./supabase-client.md)
- [Services](./services.md)
- [TanStack Query Docs](https://tanstack.com/query/latest)
