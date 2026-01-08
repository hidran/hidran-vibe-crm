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
 * Fetch a single client by ID.
 *
 * Returns null if clientId is not provided. Query is disabled until
 * a valid clientId is available to prevent wasted requests.
 */
export const useClient = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
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

/*
 * Update an existing client record.
 *
 * Invalidates both the organization's client list and the specific client
 * query to ensure consistency across views.
 */
export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Client;
    },
    onSuccess: (data) => {
      /* Invalidate both list and detail views to reflect changes */
      queryClient.invalidateQueries({ queryKey: ["clients", data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ["client", data.id] });
    },
  });
};

/*
 * Delete a client record.
 *
 * Requires both client ID and organization ID for proper cache invalidation.
 * Invalidates the organization's client list after deletion.
 */
export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, organizationId };
    },
    onSuccess: (data) => {
      /* Invalidate client list for the organization containing the deleted client */
      queryClient.invalidateQueries({ queryKey: ["clients", data.organizationId] });
    },
  });
};
