# Documentation Examples: Before and After

This document shows concrete before/after examples of how the Redis-style documentation was applied to the Vibe CRM codebase.

## Example 1: Access Control Documentation

### Before: useClients.ts - Basic Comments

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsSuperadmin } from "./useIsSuperadmin";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type ClientInsert = TablesInsert<"clients">;
type ClientUpdate = TablesUpdate<"clients">;

export const useClients = (organizationId: string | undefined) => {
  const { data: isSuperadmin } = useIsSuperadmin();

  return useQuery({
    queryKey: ["clients", organizationId, isSuperadmin],
    queryFn: async () => {
      // If user is not superadmin and no organizationId is provided, return empty array
      if (!isSuperadmin && !organizationId) return [];

      let query = supabase
        .from("clients")
        .select("*");

      // Filter by organizationId only if NOT a superadmin
      // OR if we want to filter even for superadmin when explicitly requested?
      // The requirement says "superadmin should be able to choose any clients", implying they see ALL.
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
      return data as Client;
    },
    onSuccess: (data) => {
      // Invalidate queries for specific organization
      queryClient.invalidateQueries({ queryKey: ["clients", data.organization_id] });
    },
  });
};
```

**Problems with Before**:
- No file header explaining the module's purpose
- Comments contain questions/uncertainty about requirements
- No documentation of the cache invalidation pattern
- Mutation handlers lack explanation of why queries are invalidated
- No section explaining the different behaviors for different user types

### After: useClients.ts - Redis Style Documentation

```typescript
/*
 * useClients - React Query hook for managing client data operations
 *
 * This module provides query and mutation hooks for client CRUD operations.
 * Access control is handled via superadmin status: superadmins see all clients
 * across all organizations, while regular users see only their organization's clients.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsSuperadmin } from "./useIsSuperadmin";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type ClientInsert = TablesInsert<"clients">;
type ClientUpdate = TablesUpdate<"clients">;

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

      let query = supabase
        .from("clients")
        .select("*");

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

/*
 * Create a new client record.
 *
 * After successful creation, invalidates the client list query for the
 * organization to ensure the new client appears in list views.
 */
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
      return data as Client;
    },
    onSuccess: (data) => {
      /* Invalidate organization-scoped client list to reflect new client */
      queryClient.invalidateQueries({ queryKey: ["clients", data.organization_id] });
    },
  });
};
```

**Improvements**:
- File header clearly explains the module's purpose and access control model
- Function comment has BEHAVIOR section explaining different user scenarios
- Inline comments explain the "why" (prevent unnecessary requests, sync privilege changes)
- Cache invalidation is explained with clear comment about what and why
- No uncertainty or questions in the comments - clear design decisions

---

## Example 2: Complex State Management

### Before: AuthContext.tsx - Minimal Documentation

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Clear all queries on sign out or sign in to prevent stale data
        if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
          queryClient.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Query cache will be cleared by the auth state change handler
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

**Problems with Before**:
- No file header explaining the context's role
- No invariants documented (what must always be true?)
- "stale data" comment doesn't explain the multi-tenant security implications
- useAuth hook lacks usage documentation
- No explanation of why cache clearing happens specifically on SIGNED_IN/SIGNED_OUT

### After: AuthContext.tsx - Redis Style Documentation

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

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/* Shape of the authentication context */
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/*
 * AuthProvider component - wraps the application to provide auth state
 *
 * BEHAVIOR:
 * - Initializes loading = true until the initial auth check completes
 * - Subscribes to Supabase auth state changes on mount
 * - Syncs user and session with Supabase auth state
 * - Clears React Query cache on SIGNED_IN and SIGNED_OUT to prevent stale data
 *
 * The cache clearing is essential for security: when a different user signs in,
 * the previous user's cached data should not be accessible.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    /*
     * Subscribe to Supabase auth state changes. The callback fires immediately
     * with the current session, then again on any auth events (sign in, sign out,
     * token refresh, etc.).
     */
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

    /* Cleanup: unsubscribe from auth changes on unmount */
    return () => subscription.unsubscribe();
  }, [queryClient]);

  /*
   * Sign out the current user.
   *
   * Delegates to Supabase auth.signOut(). The onAuthStateChange callback will
   * fire with SIGNED_OUT event, which clears the query cache automatically.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    /* Query cache is cleared by the SIGNED_OUT event handler above */
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

/*
 * useAuth - Hook to access authentication context
 *
 * Must be called within an AuthProvider. Throws an error if used outside
 * of the provider hierarchy to catch misconfigurations early.
 *
 * USAGE:
 *   const { user, loading, signOut } = useAuth();
 *   if (loading) return <LoadingSpinner />;
 *   if (!user) return <SignInForm />;
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

**Improvements**:
- File header includes INVARIANTS section that developers must maintain
- SECURITY note explicitly explains multi-tenant data isolation
- BEHAVIOR section documents the full lifecycle
- useAuth hook now includes USAGE examples
- Inline comments explain the subscription lifecycle
- Comments clarify why specific events trigger cache clearing

---

## Example 3: Complex Component Logic

### Before: KanbanBoard.tsx - Sparse Documentation

```typescript
const KanbanBoard = ({ tasks, organizationId, onAddTask, onEditTask }: KanbanBoardProps) => {
  const { toast } = useToast();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after" | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    tasks.forEach((task) => {
      grouped[task.status].push(task);
    });

    // Sort by position, then by created_at
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => {
        if (a.position !== null && b.position !== null) {
          return a.position - b.position;
        }
        if (a.position !== null) return -1;
        if (b.position !== null) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });

    return grouped;
  }, [tasks]);

  const calculateNewPosition = (
    targetTaskId: string,
    position: "before" | "after",
    status: TaskStatus
  ): number => {
    const tasksInColumn = tasksByStatus[status];
    const targetIndex = tasksInColumn.findIndex((t) => t.id === targetTaskId);

    // If task not found in this column (dragging between columns), append to end
    if (targetIndex === -1) return tasksInColumn.length;

    if (position === "before") {
      return targetIndex;
    } else {
      return targetIndex + 1;
    }
  };
};
```

**Problems with Before**:
- No module header explaining what the component does
- No STATE section documenting drag state variables
- No explanation of the sorting strategy (why mix positioned and unpositioned?)
- calculateNewPosition lacks explanation of edge case handling
- No comment explaining what "before/after" means in position context

### After: KanbanBoard.tsx - Redis Style Documentation

```typescript
/*
 * KanbanBoard - Drag-and-drop task management interface
 *
 * Displays tasks in a Kanban board with five columns representing task status:
 * Backlog, To Do, In Progress, Review, and Done. Tasks can be dragged between
 * columns to change status and reordered within columns to adjust position.
 *
 * FEATURES:
 * - Drag-and-drop task reordering with visual feedback
 * - Task position updates persist to database
 * - Status transitions when tasks are dropped in different columns
 * - Delete confirmation dialog with undo capability
 * - Priority and due date badges for quick reference
 * - Dark mode support with theme-aware colors
 */

/*
 * KanbanBoard - Main component for task management
 *
 * STATE:
 * - draggedTaskId: ID of the task currently being dragged
 * - dragOverTaskId: ID of the task the cursor is over (for position indicator)
 * - dragOverPosition: Whether the indicator should appear "before" or "after"
 * - deleteDialogOpen: Controls visibility of the delete confirmation dialog
 * - taskToDelete: Task pending deletion (set before opening dialog)
 *
 * The component uses controlled drag state to provide visual feedback during
 * drag operations and calculate the final position when dropping.
 */
const KanbanBoard = ({ tasks, organizationId, onAddTask, onEditTask }: KanbanBoardProps) => {
  const { toast } = useToast();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after" | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

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
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    tasks.forEach((task) => {
      grouped[task.status].push(task);
    });

    /* Sort tasks: positioned tasks first, then by creation date */
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => {
        if (a.position !== null && b.position !== null) {
          return a.position - b.position;
        }
        if (a.position !== null) return -1;
        if (b.position !== null) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });

    return grouped;
  }, [tasks]);

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
};
```

**Improvements**:
- Module header explains what the component is and what it displays
- Features list gives a quick overview of capabilities
- STATE section documents all component state variables with their purposes
- Sorting strategy is now clear: why mix positioned and unpositioned?
- calculateNewPosition has LOGIC section explaining position calculation
- Comments explain the "before/after" position context
- Edge case (cross-column moves) is explicitly documented

---

## Summary of Documentation Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **File Headers** | None/minimal | Complete with purpose and invariants |
| **Function Docs** | Basic comments | Full documentation with BEHAVIOR sections |
| **Access Control** | Unclear intentions | BEHAVIOR section documents different scenarios |
| **Side Effects** | Scattered comments | Clear documentation at mutation success handlers |
| **Complex Logic** | Basic comments | ALGORITHM sections with step-by-step explanation |
| **State Management** | No overview | STATE sections documenting all variables |
| **Security Notes** | None | Explicit SECURITY notes for multi-tenant patterns |
| **Edge Cases** | Sometimes missed | Explicitly documented |
| **Uncertainty** | Questions in comments | Clear design decisions documented |
| **Usage Examples** | None | Included in relevant hook documentation |

## Reading the Documentation

When encountering documented code, you'll find:

1. **File header** - Always at the top (what is this module?)
2. **Function comment** - Before exported functions (what does it do?)
3. **Special sections** - BEHAVIOR, STATE, ALGORITHM, SECURITY (why?)
4. **Inline comments** - Throughout code (explain non-obvious lines)
5. **Examples** - Where appropriate (show how to use)

The goal: understand "why" the code is written this way, not just "what" it does.
