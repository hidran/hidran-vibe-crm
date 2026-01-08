# Documentation Quick Reference Guide

## Where Documentation Has Been Added

### Hooks with Full Documentation

```
src/hooks/
├── useClients.ts           ✓ Documented - Client CRUD operations
├── useProjects.ts          ✓ Documented - Project management with pagination
├── useTasks.ts             ✓ Documented - Task management with Kanban support
├── useInvoices.ts          ✓ Documented - Invoice CRUD with line items
└── useOrganization.ts      ✓ Documented - Organization membership
```

### Contexts with Full Documentation

```
src/contexts/
└── AuthContext.tsx         ✓ Documented - Authentication state management
```

### Components with Full Documentation

```
src/components/
└── tasks/
    └── KanbanBoard.tsx     ✓ Documented - Drag-and-drop task board
```

## Key Documentation Patterns

### 1. Access Control
When a hook deals with superadmin vs. user access:

```typescript
/*
 * BEHAVIOR:
 * - Superadmins: fetch all records across all organizations
 * - Regular users: fetch only records in their specified organization
 */
```

**See**: `useClients.ts`, `useProjects.ts`, `useTasks.ts`, `useInvoices.ts`

### 2. Cache Invalidation
All mutations document their cache invalidation strategy:

```typescript
/*
 * Create: Invalidates list query for that organization
 * Update: Invalidates both list and detail queries
 * Delete: Invalidates list query
 */
```

**See**: All hook files - notice the comments in `onSuccess` handlers

### 3. React Query Optimization
Documented optimization techniques:

```typescript
// keepPreviousData for smooth pagination
// refetchType: "active" for high-frequency updates
// Query key includes privilege-changing variables
// enabled condition prevents unnecessary requests
```

**See**: `useProjects.ts` (pagination), `useTasks.ts` (Kanban refetch)

### 4. Complex State Management
Component state is documented with STATE sections:

```typescript
/*
 * STATE:
 * - draggedTaskId: ID of task currently being dragged
 * - dragOverTaskId: ID of task cursor is over
 * - dragOverPosition: Whether indicator shows "before" or "after"
 */
```

**See**: `KanbanBoard.tsx`

### 5. Algorithm Documentation
Complex calculations are documented with step-by-step explanations:

```typescript
/*
 * ALGORITHM/SORTING STRATEGY:
 * 1. Positioned tasks come first (ordered by position)
 * 2. Unpositioned tasks come last (ordered by creation date)
 * 3. Recalculates only when task list changes
 */
```

**See**: `KanbanBoard.tsx` - tasksByStatus sorting, `KanbanBoard.tsx` - calculateNewPosition

## Code Examples

### Example 1: Documented Hook with Access Control

**File**: `src/hooks/useClients.ts`

```typescript
/*
 * Fetch all clients for the given organization.
 *
 * BEHAVIOR:
 * - Superadmins: fetch all clients across all organizations
 * - Regular users: fetch only clients in their specified organization
 * - Returns empty array if not superadmin and no organizationId provided
 *
 * The query is enabled only when the user is a superadmin or an organizationId
 * is provided to prevent unnecessary network requests.
 */
export const useClients = (organizationId: string | undefined) => {
  const { data: isSuperadmin } = useIsSuperadmin();

  return useQuery({
    queryKey: ["clients", organizationId, isSuperadmin],
    queryFn: async () => {
      /* Return empty array immediately if user lacks necessary context */
      if (!isSuperadmin && !organizationId) return [];

      let query = supabase.from("clients").select("*");

      /*
       * Superadmins bypass organization filtering to see all clients.
       * Regular users are restricted to their organization.
       */
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
```

**Key Points**:
- File header explains the access control model
- BEHAVIOR section documents different user scenarios
- Query key includes access control variable for proper refetch
- Inline comments explain non-obvious logic
- enabled condition prevents unnecessary requests

### Example 2: Documented Context with Security

**File**: `src/contexts/AuthContext.tsx`

```typescript
/*
 * AuthContext - Authentication state management for the CRM application
 *
 * This context manages Supabase authentication state including the current user,
 * session, and loading status. It also handles cache invalidation on auth events
 * to prevent displaying stale data after sign in/out operations.
 *
 * INVARIANTS:
 * - Loading is true until the initial auth state is checked on mount
 * - User and session are synchronized; both are null or both are non-null
 * - Cache is cleared on SIGNED_IN and SIGNED_OUT to prevent stale data
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // ... implementation ...

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        /*
         * SECURITY: Clear the entire query cache on sign in/out to prevent
         * one user from accessing another user's cached data. This is critical
         * in multi-tenant scenarios where data is organization-scoped.
         */
        if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
          queryClient.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);
};
```

**Key Points**:
- File header includes INVARIANTS that must always be true
- SECURITY note highlights multi-tenant data isolation
- Comments explain the "why" behind cache clearing
- Cleanup function is documented for lifecycle completeness

### Example 3: Documented Component with Complex Logic

**File**: `src/components/tasks/KanbanBoard.tsx`

```typescript
/*
 * KanbanBoard - Drag-and-drop task management interface
 *
 * FEATURES:
 * - Drag-and-drop task reordering with visual feedback
 * - Task position updates persist to database
 * - Status transitions when tasks are dropped in different columns
 */

/*
 * Calculate the final position index for a dropped task
 *
 * LOGIC:
 * - If no target task (empty column): return length (append to end)
 * - If before: return the target task's index
 * - If after: return the target task's index + 1
 * - Cross-column moves: position defaults to column length (append)
 */
const calculateNewPosition = (
  targetTaskId: string,
  position: "before" | "after",
  status: TaskStatus
): number => {
  const tasksInColumn = tasksByStatus[status];
  const targetIndex = tasksInColumn.findIndex((t) => t.id === targetTaskId);

  /* If task not found in this column (dragging between columns), append to end */
  if (targetIndex === -1) return tasksInColumn.length;

  if (position === "before") {
    return targetIndex;
  } else {
    return targetIndex + 1;
  }
};
```

**Key Points**:
- File header lists all features
- Function documentation includes LOGIC section for algorithm
- Inline comments explain edge cases (cross-column moves)
- Comments explain why specific values are used

## Finding Documented Code

### By Type
- **Access Control Patterns**: useClients, useProjects, useTasks, useInvoices
- **State Management**: AuthContext, useOrganization
- **Complex Components**: KanbanBoard
- **Cache Management**: All hooks (see onSuccess handlers)

### By Feature
- **Superadmin Access**: useClients, useProjects, useTasks, useInvoices
- **Organization Scoping**: All hooks and contexts
- **Pagination**: useProjects
- **Drag-and-Drop**: KanbanBoard
- **Multi-tenant Security**: AuthContext

## Understanding the Documentation Style

### File Headers (Always Present)
- Purpose statement
- Key features or capabilities
- Important invariants or constraints

### Function Comments (For All Exported Functions)
- One-line purpose summary
- Parameter explanation where non-obvious
- Return value description
- Important side effects

### Special Sections

#### BEHAVIOR
Used when function behaves differently based on conditions:
```typescript
/*
 * BEHAVIOR:
 * - Condition 1: what happens
 * - Condition 2: what happens
 */
```

#### STATE
Used in components to document React state:
```typescript
/*
 * STATE:
 * - variable1: what it tracks
 * - variable2: what it tracks
 */
```

#### ALGORITHM/STRATEGY
Used for complex logic:
```typescript
/*
 * ALGORITHM:
 * 1. Step with explanation
 * 2. Step with explanation
 */
```

#### SECURITY
Used for multi-tenant or sensitive operations:
```typescript
/*
 * SECURITY: Why this is important
 */
```

## Best Practices When Reading Documented Code

1. **Start with File Header**: Understand the module's purpose
2. **Read Function Comments**: Know what the function does and why
3. **Check State Sections**: Understand component behavior
4. **Review Inline Comments**: Understand non-obvious logic
5. **Look for SECURITY Notes**: Understand data isolation and safety
6. **Trace Cache Invalidation**: Understand data consistency patterns

## Extending Documentation

When adding new code following these patterns:

### For New Hooks
```typescript
/*
 * useMyFeature - Brief description
 *
 * Detailed explanation. Include:
 * - BEHAVIOR section if access control differs
 * - Cache invalidation strategy
 * - Query key design rationale
 */
```

### For New Components
```typescript
/*
 * MyComponent - What it displays/does
 *
 * FEATURES:
 * - Feature 1
 * - Feature 2
 *
 * STATE:
 * - state1: explanation
 */
```

### For Complex Functions
```typescript
/*
 * calculateSomething - Brief description
 *
 * ALGORITHM/LOGIC:
 * 1. Step 1
 * 2. Step 2
 */
```

## Questions to Ask When Reading Code

When you encounter code, the documentation should answer:

1. **What does this function do?** (Function comment)
2. **Why does it do this?** (BEHAVIOR section, inline comments)
3. **When is it called?** (Usage examples in comments)
4. **What are the invariants?** (File header INVARIANTS section)
5. **What could go wrong?** (SECURITY notes, edge case comments)
6. **What's the performance impact?** (Optimization notes like keepPreviousData)

## Documentation Files to Review

1. **Full Documentation Strategy**: `DOCUMENTATION_STRATEGY.md`
2. **This Quick Reference**: `DOCUMENTATION_QUICK_REFERENCE.md`
3. **Redis Source Code**: https://github.com/redis/redis/blob/unstable/src/

## Summary Statistics

- **Total Files Documented**: 7
- **Total Hooks**: 5
- **Total Contexts**: 1
- **Total Components**: 1
- **Documentation Pattern**: Redis style adapted for TypeScript/React
- **Focus**: WHY and WHAT HAPPENS, not HOW (code shows that)

---

Remember: Good documentation makes code maintainable. When in doubt, prefer a brief, clear comment over silence. The goal is to help future readers (including yourself!) understand the "why" behind the code.
