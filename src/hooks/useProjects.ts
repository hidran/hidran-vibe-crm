/*
 * useProjects - React Query hook for managing project data operations
 *
 * This module provides query and mutation hooks for project CRUD operations.
 * Projects are organization-scoped resources with superadmin override capabilities.
 * All queries are optimized with React Query caching and automatic invalidation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsSuperadmin } from "./useIsSuperadmin";
import {
  projectService,
  type ProjectInsert,
  type ProjectUpdate,
  type ProjectFilters,
} from "@/services/supabase/projectService";

/*
 * Fetch all projects for the given organization.
 *
 * BEHAVIOR:
 * - Superadmins: fetch all projects across all organizations
 * - Regular users: fetch only projects in their specified organization
 *
 * The query is disabled until the user is a superadmin or an organizationId
 * is provided. Query key includes isSuperadmin to refetch when privileges change.
 */
export const useProjects = (organizationId: string | undefined) => {
  const { data: isSuperadmin } = useIsSuperadmin();

  return useQuery({
    queryKey: ["projects", "list", organizationId, isSuperadmin],
    queryFn: async () => {
      const response = await projectService.list({
        organizationId,
        isSuperadmin,
      });
      return response.data;
    },
    enabled: isSuperadmin || !!organizationId,
  });
};

/* Parameters for paginated project list queries */
export interface PaginatedProjectsParams {
  organizationId?: string;
  page: number;
  pageSize: number;
  filters?: ProjectFilters;
}

/*
 * Fetch paginated projects with optional filtering.
 *
 * Uses keepPreviousData to maintain the previous page's data while
 * fetching the next page, improving perceived performance.
 * Includes isSuperadmin in the query key to refetch when access changes.
 */
export const usePaginatedProjects = (params: PaginatedProjectsParams) => {
  const { organizationId, page, pageSize, filters } = params;
  const { data: isSuperadmin } = useIsSuperadmin();

  return useQuery({
    queryKey: ["projects", "paginated", organizationId, isSuperadmin, page, pageSize, filters],
    queryFn: () =>
      projectService.list({
        organizationId,
        isSuperadmin,
        filters,
      pagination: { page, pageSize },
    }),
    enabled: isSuperadmin || !!organizationId,
    placeholderData: (previousData) => previousData,
  });
};

/*
 * Fetch a single project by ID.
 *
 * Returns null if projectId is not provided. Query is disabled until
 * a valid projectId is available.
 */
export const useProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectService.getById(projectId),
    enabled: !!projectId,
  });
};

/*
 * Create a new project record.
 *
 * Invalidates both the project list and the newly created project's
 * individual query to ensure consistency.
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: ProjectInsert) => {
      return projectService.create(project);
    },
    onSuccess: (data) => {
      /* Invalidate all project list variants and the specific project query */
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
    },
  });
};

/*
 * Update an existing project record.
 *
 * Invalidates both the project list and the specific project query
 * to keep all views synchronized.
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProjectUpdate & { id: string }) => {
      return projectService.update({ id, updates });
    },
    onSuccess: (data) => {
      /* Invalidate list and detail views to reflect updated project data */
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
    },
  });
};

/*
 * Delete a project record.
 *
 * Requires projectId and organizationId to ensure proper cache invalidation
 * and audit trail compatibility.
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      return projectService.remove({ id, organizationId });
    },
    onSuccess: (data) => {
      /* Invalidate all project list queries after deletion */
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};
