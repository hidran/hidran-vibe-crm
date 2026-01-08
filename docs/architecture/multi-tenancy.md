# Multi-Tenant Architecture

Vibe CRM is designed as a multi-tenant application where multiple organizations (and their users) can operate independently within the same database while maintaining complete data isolation.

## What is Multi-Tenancy?

Multi-tenancy means:
- **Single database** - All organizations share one PostgreSQL database
- **Data isolation** - Each organization only sees its own data
- **Efficient** - Reduces infrastructure costs
- **Scalable** - Easy to add new organizations

### Example

```
Single Vibe CRM Instance

┌─────────────────────────────┐
│   Acme Corporation Org      │
├─────────────────────────────┤
│ - 5 users                   │
│ - 10 clients                │
│ - 15 projects               │
│ - 45 tasks                  │
└─────────────────────────────┘

┌─────────────────────────────┐
│   TechStart Inc Org         │
├─────────────────────────────┤
│ - 3 users                   │
│ - 8 clients                 │
│ - 12 projects               │
│ - 30 tasks                  │
└─────────────────────────────┘

┌─────────────────────────────┐
│   Creative Studio Org       │
├─────────────────────────────┤
│ - 2 users                   │
│ - 6 clients                 │
│ - 8 projects                │
│ - 20 tasks                  │
└─────────────────────────────┘

All share the same database → PostgreSQL Database ←
```

## How Data Isolation Works

### 1. Database Level: organization_id Column

Every customer-facing table has an `organization_id` column:

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  ...
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  ...
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  ...
);
```

Every record belongs to exactly one organization.

### 2. Database Level: Row-Level Security (RLS)

PostgreSQL Row-Level Security enforces data access at the database level:

```sql
-- Only select records for the user's organization
CREATE POLICY "Users see only their organization's clients" ON clients
  FOR SELECT
  USING (organization_id = auth.jwt() -> 'organization_id');

-- Only insert records into the user's organization
CREATE POLICY "Users can only insert into their organization" ON clients
  FOR INSERT
  WITH CHECK (organization_id = auth.jwt() -> 'organization_id');

-- Similar policies for UPDATE and DELETE
```

**Benefits**:
- Database enforces access (can't bypass with app code)
- Even SQL injection can't access other organizations' data
- Supabase handles this automatically

### 3. Application Level: Organization Context

The application maintains organization context:

```typescript
// Get current organization context
const { organization } = useOrganization();

// Use in queries
const { data: clients } = useClients(organization?.id);

// Queries filter by organization
const { data, error } = await supabase
  .from("clients")
  .select("*")
  .eq("organization_id", organization.id);
```

### 4. Defense in Depth

Multiple levels ensure security:

1. **Authentication**: Only authenticated users
2. **Authorization**: User belongs to organization
3. **Database RLS**: Records filtered at DB level
4. **Application Filtering**: App layer also filters
5. **Audit Logs**: Track who accessed what

## User and Organization Relationships

### Tables Structure

```
organizations
├── id (UUID, PK)
├── name (text)
├── slug (text)
├── plan (enum: free, professional, business)
└── created_at (timestamp)

auth.users (Supabase managed)
├── id (UUID, PK)
├── email (text)
└── ...

user_roles
├── user_id (UUID, FK to users)
├── organization_id (UUID, FK to organizations)
├── role (enum: member, admin, owner)
└── PRIMARY KEY (user_id, organization_id)
```

### Role Hierarchy

```
Superadmin
  ├─ Can create organizations
  ├─ Can access any organization
  ├─ Can manage any user in any org
  └─ Can access all reports/analytics

Organization Owner
  ├─ Created the organization
  ├─ Can manage all organization members
  ├─ Can change organization settings
  ├─ Can delete organization
  └─ Full access to organization data

Admin
  ├─ Can invite users to organization
  ├─ Can manage roles of other users
  ├─ Can remove users from organization
  └─ Full access to organization data

Member
  ├─ Can view organization data
  ├─ Can create/edit own resources
  ├─ Cannot modify others' resources
  └─ Cannot manage users/organization
```

## Code Examples

### Checking User's Organization

```typescript
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user } = useAuth();
  const { organization } = useOrganization();

  // User belongs to organization
  if (user && organization) {
    // Safe to fetch org-scoped data
    const { data: clients } = useClients(organization.id);
  }
}
```

### Superadmin Accessing All Organizations

```typescript
function SuperadminDashboard() {
  const { data: isSuperadmin } = useIsSuperadmin();
  const { data: allOrganizations } = useOrganizations(!!isSuperadmin);

  if (!isSuperadmin) {
    return <NotAuthorized />;
  }

  // Can see all organizations
  return (
    <div>
      {allOrganizations.map(org => (
        <OrgCard key={org.id} org={org} />
      ))}
    </div>
  );
}
```

### Creating a Resource with Organization Context

```typescript
import { useOrganization } from "@/hooks/useOrganization";
import { useCreateClient } from "@/hooks/useClients";

function CreateClientForm() {
  const { organization } = useOrganization();
  const { mutate: createClient } = useCreateClient();

  const handleSubmit = (formData) => {
    // Always include organization_id
    createClient({
      ...formData,
      organization_id: organization.id, // Critical!
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Filtering by Organization in Queries

```typescript
// Hook always filters by organization
export const useClients = (organizationId?: string) => {
  return useQuery({
    queryKey: ["clients", organizationId],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*");

      // App-level filtering (defense in depth)
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId, // Don't fetch without org
  });
};
```

## Superadmin Special Cases

### Superadmin Access Without Organization

Superadmin users can access all data but still need to:
1. Select an organization to work with, or
2. View all organizations' data in admin interface

### Queries for Superadmin

```typescript
export const useClients = (organizationId?: string) => {
  const { data: isSuperadmin } = useIsSuperadmin();

  return useQuery({
    queryKey: ["clients", organizationId, isSuperadmin],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*");

      // Superadmin sees all, regular users filtered
      if (!isSuperadmin && organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: isSuperadmin || !!organizationId,
  });
};
```

## Adding New Resources

When adding a new resource:

### 1. Add to Database

```sql
CREATE TABLE my_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

### 2. Enable RLS

```sql
ALTER TABLE my_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their org's resources" ON my_resources
  FOR SELECT
  USING (organization_id = (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid()
    LIMIT 1
  ));
```

### 3. Create Hook with Organization Filter

```typescript
export const useMyResources = (organizationId?: string) => {
  return useQuery({
    queryKey: ["myResources", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("my_resources")
        .select("*")
        .eq("organization_id", organizationId); // Always filter

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
};
```

### 4. Use in Components

```typescript
const { organization } = useOrganization();
const { data: resources } = useMyResources(organization?.id);
```

## Common Pitfalls

### Don't: Forget organization_id

```typescript
// ✗ BAD - Missing organization context
const createItem = async (data) => {
  const { data: result, error } = await supabase
    .from("items")
    .insert({ name: data.name }); // Where's organization_id?
};

// ✓ GOOD - Includes organization
const createItem = async (data) => {
  const { data: result, error } = await supabase
    .from("items")
    .insert({
      ...data,
      organization_id: currentOrgId, // Required!
    });
};
```

### Don't: Skip Application Filtering

```typescript
// ✗ BAD - Relies only on RLS (single point of failure)
const { data } = await supabase
  .from("clients")
  .select("*");

// ✓ GOOD - Defensive approach
const { data } = await supabase
  .from("clients")
  .select("*")
  .eq("organization_id", organizationId); // App-level too
```

### Don't: Assume Organization Is Always Available

```typescript
// ✗ BAD - Crashes if no organization
const { organization } = useOrganization();
const { data } = useClients(organization.id); // Error if undefined

// ✓ GOOD - Handles undefined
const { organization } = useOrganization();
const { data } = useClients(organization?.id); // Safe
```

## Testing Multi-Tenancy

### Verify Isolation

1. Create two organizations with test data
2. Log in as user in Org A
3. Try to access Org B's data (should fail)
4. Verify browser shows only Org A data

### Test Superadmin Access

1. Log in as superadmin
2. Verify can see all organizations
3. Switch between organizations
4. Verify data changes appropriately

### Test RLS Policies

```sql
-- Verify policy is active
SELECT * FROM pg_policies WHERE tablename = 'clients';

-- Test as regular user (should be limited)
-- Test as superadmin (should see all)
```

## Performance Considerations

### Indexes

Important indexes for multi-tenant queries:

```sql
-- Speed up organization-filtered queries
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_tasks_organization_id ON tasks(organization_id);

-- Combined indexes for common queries
CREATE INDEX idx_clients_org_name ON clients(organization_id, name);
CREATE INDEX idx_projects_org_status ON projects(organization_id, status);
```

### Query Optimization

```typescript
// ✓ Good - Limited columns and organization filter
const { data } = await supabase
  .from("clients")
  .select("id, name, email") // Only needed fields
  .eq("organization_id", orgId)
  .order("name")
  .limit(50);

// ✗ Slow - All columns, no organization context
const { data } = await supabase
  .from("clients")
  .select("*"); // Unnecessary columns
```

## Security Checklist

- [ ] All customer tables have `organization_id`
- [ ] RLS policies enforce organization filtering
- [ ] Queries filter by `organization_id` in app
- [ ] New queries tested with cross-organization access
- [ ] Superadmin access is intentional and logged
- [ ] User roles prevent cross-org access
- [ ] Tests verify isolation between orgs

---

See also:
- [Authentication & Permissions](./auth-permissions.md)
- [Database Schema](./database.md)
- [Architecture Overview](./overview.md)
