/*
 * useTasks - React Query hook for managing task data operations
 *
 * This module provides query and mutation hooks for task CRUD operations.
 * Tasks are project-scoped work items with status tracking and positioning
 * for Kanban board ordering. Superadmins can view all tasks across organizations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsSuperadmin } from "./useIsSuperadmin";
import {
  taskService,
  type TaskInsert,
  type TaskUpdate,
  type TaskFilters as UseTasksFilters,
  type TaskStatus,
} from "@/services/supabase/taskService";

export type { TaskStatus } from "@/services/supabase/taskService";

/*
 * Fetch all tasks for the given organization with optional filtering.
 *
 * BEHAVIOR:
 * - Superadmins: fetch all tasks across all organizations
 * - Regular users: fetch only tasks in their specified organization
 *
 * Filters can include: project, assignee, priority, status constraints.
 * Query key includes isSuperadmin status to refetch when privilege level changes.
 */
export const useTasks = (organizationId: string | undefined, filters?: UseTasksFilters) => {
  const { data: isSuperadmin } = useIsSuperadmin();

  return useQuery({
    queryKey: ["tasks", organizationId, filters, isSuperadmin],
    queryFn: () =>
      taskService.list({
        organizationId,
        isSuperadmin,
        filters,
      }),
    enabled: !!isSuperadmin || !!organizationId,
  });
};

/*
 * Fetch a single task by ID.
 *
 * Returns null if taskId is not provided. Query is disabled until
 * a valid taskId is available.
 */
export const useTask = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => taskService.getById(taskId),
    enabled: !!taskId,
  });
};

/*
 * Create a new task record.
 *
 * Invalidates the task list query for the organization to ensure
 * the new task appears in all views.
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      return taskService.create(task);
    },
    onSuccess: (data) => {
      /* Invalidate organization task list to reflect new task */
      queryClient.invalidateQueries({ queryKey: ["tasks", data.organization_id] });
    },
  });
};

/*
 * Update an existing task record.
 *
 * Invalidates both the organization's task list and the specific task query
 * to keep all views synchronized.
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      return taskService.update({ id, updates });
    },
    onSuccess: (data) => {
      /* Invalidate list and detail views to reflect updated task */
      queryClient.invalidateQueries({ queryKey: ["tasks", data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
    },
  });
};

/*
 * Delete a task record.
 *
 * Requires both task ID and organization ID for proper cache invalidation.
 * Invalidates the organization's task list after deletion.
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      return taskService.remove({ id, organizationId });
    },
    onSuccess: (data) => {
      /* Invalidate task list for the organization containing deleted task */
      queryClient.invalidateQueries({ queryKey: ["tasks", data.organizationId] });
    },
  });
};

/*
 * Update task status and position in Kanban board.
 *
 * This mutation handles both status transitions (e.g., backlog -> in_progress)
 * and position updates for ordering tasks within a column. The position field
 * enables drag-and-drop reordering while refetching only active queries.
 *
 * REFETCH STRATEGY:
 * Uses refetchType: "active" to refetch only queries that are currently
 * in use, avoiding unnecessary background updates to inactive views.
 */
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, position }: { id: string; status: TaskStatus; position?: number }) => {
      return taskService.updateStatus({ id, status, position });
    },
    onSuccess: (data) => {
      /*
       * Refetch active queries only - useful for Kanban board views where
       * task status changes are frequent and background refetches would be noisy.
       */
      queryClient.invalidateQueries({
        queryKey: ["tasks", data.organization_id],
        refetchType: "active"
      });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
    },
  });
};
