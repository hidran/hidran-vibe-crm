# Vibe CRM Code Documentation Strategy

## Overview

This document describes the inline code documentation strategy applied to the Vibe CRM codebase, following Redis's documentation style. The goal is to make the codebase more maintainable and easier for new developers to understand without being overly verbose.

## Redis Documentation Style Characteristics

Redis documentation follows these principles:

1. **File Headers**: Brief description of the module's purpose and key invariants
2. **Function Comments**: Explain what the function does, how it behaves, and any side effects
3. **Logic Explanations**: Document non-obvious code paths and complex algorithms
4. **Edge Cases**: Call out special handling, thread-safety concerns, and constraints
5. **Clarity First**: Focus on understanding "why" rather than "what" (code shows what)
6. **Conciseness**: Avoid verbosity; comments should be informative but brief

## Adapted for TypeScript/React

For the Vibe CRM TypeScript/React codebase, we adapted these principles:

- **Multi-line block comments** (`/* ... */`) for file headers, function documentation, and complex logic blocks
- **Single-line comments** (`/* ... */`) for inline explanations of non-obvious code
- **BEHAVIOR sections** documenting different code paths based on conditions (e.g., superadmin vs regular user)
- **STATE sections** explaining component state management and lifecycle
- **Emphasis on side effects** especially cache invalidation in React Query mutations

## Documentation Strategy

### What Gets Documented

1. **File Headers**: Always
   - Module purpose
   - Key features or invariants
   - Multi-tenant/security considerations where applicable

2. **Function/Hook Declarations**: Always for exported functions
   - Purpose statement
   - Parameter behavior
   - Return value explanation
   - Important side effects or cache invalidation patterns

3. **Complex Logic Blocks**: When non-obvious
   - Sorting strategies
   - Position calculations for drag-and-drop
   - State transitions
   - Cache invalidation patterns

4. **Edge Cases & Constraints**: When important
   - Thread-safety notes
   - Cross-module dependencies
   - Permission checks
   - Security implications

5. **Inline Implementation Details**: Only when truly non-obvious
   - Single-line comments for important operations
   - Explain the "why", not the "what"

### What NOT to Document

- Obvious variable assignments
- Standard React/TypeScript patterns
- Well-named functions with clear parameters
- Self-documenting code that speaks for itself
- CSS class names and styling details
- UI component implementation details

## Documented Files

### Core Hooks (React Query Integration)

#### 1. `/src/hooks/useClients.ts`

**Key Patterns**:
- Superadmin vs organization-scoped access control
- Cache invalidation strategy for CRUD operations
- Organization-based query key segmentation

**Documentation Highlights**:
- File header explaining access control model
- Function-level documentation for `useClients()` explaining superadmin override
- Comments on cache invalidation triggers in mutation success handlers
- Inline notes about why empty arrays are returned for unauthorized requests

**Before/After Example**:
```typescript
// BEFORE
export const useClients = (organizationId: string | undefined) => {
  const { data: isSuperadmin } = useIsSuperadmin();
  return useQuery({
    queryKey: ["clients", organizationId, isSuperadmin],
    queryFn: async () => {
      if (!isSuperadmin && !organizationId) return [];
      let query = supabase.from("clients").select("*");
      if (!isSuperadmin && organizationId) {
        query = query.eq("organization_id", organizationId);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data as Client[];
    },
    enabled: isSuperadmin || !!organizationId,
  });
};

// AFTER
/*
 * Fetch all clients for the given organization.
 *
 * BEHAVIOR:
 * - Superadmins: fetch all clients across all organizations
 * - Regular users: fetch only clients in their specified organization
 * - Returns empty array if not superadmin and no organizationId provided
 *
 * The query is enabled only when the user is a superadmin or an organizationId
 * is provided to prevent unnecessary network requests. Query key includes
 * isSuperadmin status to refetch when privilege level changes.
 */
export const useClients = (organizationId: string | undefined) => {
  const { data: isSuperadmin } = useIsSuperadmin();
  return useQuery({
    queryKey: ["clients", organizationId, isSuperadmin],
    queryFn: async () => {
      /* Return empty array immediately if user lacks necessary context */
      if (!isSuperadmin && !organizationId) return [];
      // ... rest of implementation
    },
    enabled: isSuperadmin || !!organizationId,
  });
};
```

#### 2. `/src/hooks/useProjects.ts`

**Key Patterns**:
- Paginated queries with filtering
- keepPreviousData optimization for smooth pagination

**Documentation Highlights**:
- File header for project management patterns
- Separate documentation for list vs paginated variants
- Notes on keepPreviousData for perceived performance

#### 3. `/src/hooks/useTasks.ts`

**Key Patterns**:
- Task filtering with optional constraints
- useUpdateTaskStatus with refetchType: "active" for Kanban boards
- Position-based ordering for drag-and-drop

**Documentation Highlights**:
- File header explaining task workflow and positioning
- Detailed explanation of `useUpdateTaskStatus` refetch strategy
- Comments on why `refetchType: "active"` is used for Kanban boards

#### 4. `/src/hooks/useInvoices.ts`

**Key Patterns**:
- Line item transactions with batch operations
- Financial record considerations

**Documentation Highlights**:
- File header emphasizing financial transaction nature
- Notes on line item lifecycle (created, updated, deleted)
- Warning about deletion best practices for financial records

#### 5. `/src/hooks/useOrganization.ts`

**Key Patterns**:
- User organization membership (one-to-one)
- Two-step creation flow (organization + membership)

**Documentation Highlights**:
- File header explaining organization as top-level container
- Documentation of two-step creation pattern
- Notes on maybeSingle() usage for optional membership

### Context Providers

#### `/src/contexts/AuthContext.tsx`

**Key Patterns**:
- Auth state synchronization
- Security-critical cache invalidation
- Multi-tenant data isolation

**Documentation Highlights**:
- File header with invariants section (loading state, user/session sync)
- SECURITY note on cache clearing for multi-tenant isolation
- Explanation of useAuth hook requirements and usage
- Comments on Supabase auth state change subscription

### Complex Components

#### `/src/components/tasks/KanbanBoard.tsx`

**Key Patterns**:
- Drag-and-drop with position calculation
- Visual feedback during drag operations
- Status transitions via drag-and-drop

**Documentation Highlights**:
- File header listing all features
- STATE section explaining drag state variables
- Detailed comments on:
  - Task grouping and sorting strategy
  - Drag-over state management
  - Position calculation logic (before/after)
  - Drop handling flow

**Before/After Example**:
```typescript
// BEFORE
const tasksByStatus = useMemo(() => {
  // ... grouping logic ...
  // Sort by position, then by created_at
  Object.keys(grouped).forEach((status) => {
    grouped[status as TaskStatus].sort((a, b) => {
      // sorting implementation
    });
  });
  return grouped;
}, [tasks]);

// AFTER
/*
 * Group tasks by status and sort within each group
 *
 * SORTING STRATEGY:
 * 1. Tasks with explicit position values come first (ordered by position)
 * 2. Tasks without position come last (ordered by creation date, newest first)
 *
 * This allows manual positioning of prioritized tasks while auto-sorting
 * newly created tasks. Recalculates only when the task list changes.
 */
const tasksByStatus = useMemo(() => {
  // ... grouping logic ...
  /* Sort tasks: positioned tasks first, then by creation date */
  Object.keys(grouped).forEach((status) => {
    grouped[status as TaskStatus].sort((a, b) => {
      // sorting implementation
    });
  });
  return grouped;
}, [tasks]);
```

## Documentation Patterns Used

### 1. File Headers
```typescript
/*
 * ModuleName - Brief description
 *
 * Longer explanation of purpose and key features.
 * Key invariants or constraints worth noting.
 */
```

### 2. Function Documentation
```typescript
/*
 * functionName - What it does
 *
 * Detailed explanation including:
 * - Parameters and their meaning
 * - Return value
 * - Important side effects
 * - Access control or security notes
 */
```

### 3. Behavior Sections
```typescript
/*
 * BEHAVIOR:
 * - Scenario 1: what happens
 * - Scenario 2: what happens
 */
```

### 4. Algorithm Documentation
```typescript
/*
 * Calculate X result
 *
 * ALGORITHM/STRATEGY:
 * 1. Step one with rationale
 * 2. Step two with rationale
 * 3. Expected outcome
 */
```

### 5. Inline Comments
```typescript
/* Single-line explanation of non-obvious operation */
if (someCondition) {
  /* Explain why this specific action is taken */
  doSomething();
}
```

## Code Organization and Documentation Relationships

### Access Control Pattern
Most hooks follow an access control pattern that's now consistently documented:

- File header explains superadmin vs user access
- Query key includes isSuperadmin to ensure refetch on privilege changes
- Query is disabled unless user has necessary permissions
- Organization-based filtering applied for non-superadmins

### Cache Invalidation Pattern
All mutation hooks follow consistent cache invalidation patterns:

1. **Create**: Invalidate list query for that organization
2. **Update**: Invalidate both list and detail queries
3. **Delete**: Invalidate list query (optionally detail if applicable)

This pattern is now documented at both file and function level.

### React Query Best Practices
Documentation highlights:

- enabled condition to prevent unnecessary requests
- Query key design that includes access-control variables
- keepPreviousData for smooth pagination
- refetchType: "active" for high-frequency updates (Kanban)
- Error handling with user feedback

## Benefits of This Documentation Style

1. **Reduced Onboarding Time**: New developers understand the "why" behind code patterns
2. **Maintainability**: When patterns are documented, changes are less likely to break invariants
3. **Security**: Multi-tenant considerations and cache isolation are explicitly noted
4. **Code Review**: Reviewers have reference for expected patterns and can catch deviations
5. **Debugging**: Comments explain non-obvious logic, making troubleshooting faster
6. **Confidence**: Team members can confidently modify code when the intent is clear

## Files Documented

1. `/src/hooks/useClients.ts` - Client CRUD with access control
2. `/src/hooks/useProjects.ts` - Project management with pagination
3. `/src/hooks/useTasks.ts` - Task management with Kanban support
4. `/src/hooks/useInvoices.ts` - Invoice CRUD with line items
5. `/src/hooks/useOrganization.ts` - Organization membership management
6. `/src/contexts/AuthContext.tsx` - Authentication state management
7. `/src/components/tasks/KanbanBoard.tsx` - Drag-and-drop task board

## Next Steps for Broader Documentation

1. **Services Layer**: Document Supabase service files (clientsService, projectService, etc.)
2. **Utility Functions**: Document utility functions in the utils directory
3. **API Integration**: Document any API client/integration code
4. **Type Definitions**: Add comments to complex type definitions
5. **Store/State Management**: Document Redux, Zustand, or other state management

## Maintenance Guidelines

- When modifying documented code, update comments if logic changes
- When adding new functions, follow the documentation style in the module
- When reviewing code, suggest improvements to clarity and documentation
- Keep documentation focused on "why" and "what happens", not "how it's implemented"
- Update invariants in file headers when design changes occur

## References

Redis source code documentation style:
- https://github.com/redis/redis/blob/unstable/src/server.c
- https://github.com/redis/redis/blob/unstable/src/db.c
