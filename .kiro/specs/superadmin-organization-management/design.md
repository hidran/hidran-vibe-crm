# Superadmin Organization Management - Design Document

## Overview

The Superadmin Organization Management System provides a privileged administrative interface for managing organizations within the VibeManager platform. It extends the existing multi-tenant architecture with superadmin capabilities, allowing designated users to perform CRUD operations on organizations, view organization members, and maintain the platform's tenant structure. The system uses Supabase RLS policies to enforce access control and follows the established patterns for data fetching and UI components.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Organizations│  │ Organization │  │  Member List │      │
│  │     Page     │  │    Dialog    │  │    Dialog    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                  ┌────────▼────────┐                         │
│                  │  Custom Hooks   │                         │
│                  │  (TanStack      │                         │
│                  │   Query)        │                         │
│                  └────────┬────────┘                         │
└───────────────────────────┼──────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │  Supabase Client  │
                  └─────────┬─────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│ Organizations  │  │ Organization   │  │     RLS     │
│     Table      │  │    Members     │  │  Policies   │
└────────────────┘  └────────────────┘  └─────────────┘
```

## Components and Interfaces

### Data Models

#### Profile Extension
```typescript
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_superadmin: boolean; // New field
  created_at: string;
  updated_at: string;
}
```

#### Organization Type
```typescript
interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
```

#### Organization with Member Count
```typescript
interface OrganizationWithStats {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  member_count: number;
}
```

#### Organization Member Type
```typescript
interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profile: {
    email: string;
    full_name: string | null;
  };
}
```

### Database Schema Changes

#### Add is_superadmin to profiles table
```sql
ALTER TABLE profiles 
ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE;

-- Create index for superadmin lookups
CREATE INDEX idx_profiles_is_superadmin 
ON profiles(is_superadmin) 
WHERE is_superadmin = TRUE;
```

#### Create RLS Policy for Superadmin Access
```sql
-- Policy to allow superadmins to view all organizations
CREATE POLICY "Superadmins can view all organizations"
ON organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_superadmin = TRUE
  )
);

-- Policy to allow superadmins to insert organizations
CREATE POLICY "Superadmins can insert organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_superadmin = TRUE
  )
);

-- Policy to allow superadmins to update organizations
CREATE POLICY "Superadmins can update organizations"
ON organizations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_superadmin = TRUE
  )
);

-- Policy to allow superadmins to delete organizations
CREATE POLICY "Superadmins can delete organizations"
ON organizations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_superadmin = TRUE
  )
);
```

### Custom Hooks

#### useIsSuperadmin
```typescript
const useIsSuperadmin = () => {
  // Returns: { isSuperadmin: boolean, isLoading: boolean }
  // Queries the current user's profile to check is_superadmin flag
}
```

#### useOrganizations
```typescript
const useOrganizations = () => {
  // Returns: { data: OrganizationWithStats[], isLoading, error }
  // Queries all organizations with member counts
  // Only accessible to superadmins
}
```

#### useCreateOrganization
```typescript
const useCreateOrganization = () => {
  // Returns: { mutate, isPending, error }
  // Creates a new organization
  // Validates superadmin status
  // Invalidates organizations query on success
}
```

#### useUpdateOrganization
```typescript
const useUpdateOrganization = () => {
  // Returns: { mutate, isPending, error }
  // Updates an existing organization
  // Validates superadmin status
  // Invalidates organizations query on success
}
```

#### useDeleteOrganization
```typescript
const useDeleteOrganization = () => {
  // Returns: { mutate, isPending, error }
  // Deletes an organization
  // Validates superadmin status
  // Cascades to related data
  // Invalidates organizations query on success
}
```

#### useOrganizationMembers
```typescript
const useOrganizationMembers = (organizationId: string) => {
  // Returns: { data: OrganizationMember[], isLoading, error }
  // Queries members for a specific organization
  // Includes profile information
}
```

### React Components

#### Organizations Page
- Main page component for organization management
- Displays table of all organizations
- Provides search and filter functionality
- Shows "Create Organization" button
- Accessible only to superadmins
- Redirects non-superadmins to dashboard

#### OrganizationDialog
- Reusable dialog for create/edit operations
- Props: open, onOpenChange, organization (null for create)
- Uses React Hook Form with Zod validation
- Fields: name
- Displays loading state during submission
- Shows success/error toast notifications

#### OrganizationMembersDialog
- Dialog to display organization members
- Props: open, onOpenChange, organizationId
- Shows table of members with email, role, and join date
- Read-only view (no member management in this spec)

#### SuperadminRoute
- Protected route component for superadmin-only pages
- Checks useIsSuperadmin hook
- Redirects non-superadmins to dashboard
- Shows loading state while checking permissions

### Data Flow

1. **Superadmin Check Flow**:
   - User logs in → AuthContext loads user → useIsSuperadmin queries profile → Navigation shows/hides Organizations link

2. **Organization List Flow**:
   - Superadmin navigates to /organizations → useOrganizations fetches → Display table with stats

3. **Create Organization Flow**:
   - Click "Create" → Open dialog → Fill form → Submit → useCreateOrganization mutates → Invalidate query → Close dialog → Show toast

4. **Edit Organization Flow**:
   - Click "Edit" → Open dialog with data → Modify form → Submit → useUpdateOrganization mutates → Invalidate query → Close dialog → Show toast

5. **Delete Organization Flow**:
   - Click "Delete" → Show confirmation → Confirm → useDeleteOrganization mutates → Invalidate query → Show toast

6. **View Members Flow**:
   - Click member count → useOrganizationMembers fetches → Display in dialog

## Data Models

### Database Schema

#### Modified Table: profiles
- Add `is_superadmin` boolean column (default: false)
- Add index on `is_superadmin` for performance

#### Existing Tables Used
- organizations
- organization_members
- profiles

### Query Optimization

- Index on `profiles.is_superadmin` for fast superadmin checks
- Join organizations with organization_members for member counts
- Use RLS policies for automatic access control
- Cache superadmin status in React Query

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Superadmin access control
*For any* user, if they are not a superadmin, they should be unable to access organization management features.
**Validates: Requirements 1.4, 8.1, 8.2**

### Property 2: Organization name uniqueness
*For any* two organizations, their names should be unique across the entire system.
**Validates: Requirements 4.1, 5.2**

### Property 3: Organization CRUD operations require superadmin
*For any* organization CRUD operation (create, update, delete), the operation should only succeed if the user has is_superadmin set to true.
**Validates: Requirements 2.5, 8.2**

### Property 4: Organization deletion cascades
*For any* organization deletion, all related data (clients, projects, tasks, invoices) should be removed from the database.
**Validates: Requirements 6.3, 11.1, 11.3**

### Property 5: Member count accuracy
*For any* organization, the displayed member count should equal the actual number of records in organization_members for that organization.
**Validates: Requirements 7.1, 7.2**

### Property 6: Superadmin flag persistence
*For any* user designated as superadmin, the is_superadmin flag should remain true until explicitly revoked.
**Validates: Requirements 1.2, 1.3**

### Property 7: Navigation visibility based on role
*For any* user, the Organizations navigation link should be visible if and only if they are a superadmin.
**Validates: Requirements 9.1, 9.2**

### Property 8: Organization creation generates unique ID
*For any* newly created organization, the system should generate a unique organization ID that does not conflict with existing organizations.
**Validates: Requirements 4.3**

### Property 9: RLS policy enforcement
*For any* database query on organizations table, non-superadmin users should receive zero results regardless of query parameters.
**Validates: Requirements 8.4**

### Property 10: Error messages on validation failure
*For any* failed validation (empty name, duplicate name), the system should display a descriptive error message.
**Validates: Requirements 10.1, 10.2, 10.4**

## Error Handling

### Access Denied Errors
- Redirect non-superadmins attempting to access /organizations
- Display "Access Denied" message if API calls fail due to permissions
- Log unauthorized access attempts for security monitoring

### Validation Errors
- Show inline error messages for empty organization names
- Display error toast for duplicate organization names
- Highlight invalid form fields with red borders

### Database Errors
- Catch and display user-friendly messages for database failures
- Provide retry buttons for failed operations
- Log detailed errors to console for debugging

### Cascade Delete Errors
- Warn if organization has active subscriptions (future feature)
- Display error if foreign key constraints prevent deletion
- Provide option to force delete with confirmation

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

- **Superadmin check**: Verify useIsSuperadmin returns correct status
- **Organization list**: Test table renders with data
- **Create dialog**: Verify form validation and submission
- **Edit dialog**: Test pre-population and update
- **Delete confirmation**: Verify confirmation dialog appears
- **Member list**: Test member display with profile data
- **Navigation**: Verify Organizations link visibility based on role

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check**:

- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with a comment referencing the design document property
- Tag format: `// Feature: superadmin-organization-management, Property {number}: {property_text}`
- Each correctness property will be implemented by a SINGLE property-based test

**Property test coverage**:
- Access control (Properties 1, 3, 9)
- Data integrity (Properties 2, 4, 8)
- Display accuracy (Properties 5, 7)
- Persistence (Property 6)
- Error handling (Property 10)

### Integration Testing

Integration tests will verify:
- Complete organization CRUD flow from UI to database
- Superadmin access control across all endpoints
- Cascade deletion of related data
- Member count calculation accuracy
- Navigation visibility updates on role change
- RLS policy enforcement at database level

### Manual Testing Checklist

- Designate a user as superadmin and verify access
- Create organizations with various names
- Attempt to create duplicate organization names
- Edit organization names and verify updates
- Delete organizations and verify cascade
- View organization members
- Attempt access as non-superadmin user
- Verify navigation link visibility
- Test error scenarios (network failures, validation errors)
- Verify RLS policies in database directly
