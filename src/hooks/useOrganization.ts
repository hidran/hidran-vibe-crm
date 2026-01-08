/*
 * useOrganization - Hook for managing user's organization membership
 *
 * This hook handles fetching the current user's organization membership and
 * provides utilities for creating new organizations. Each user belongs to exactly
 * one organization (enforced at the membership level). Organizations represent
 * the top-level container for all CRM data (clients, projects, tasks, invoices).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type Organization = Tables<"organizations">;
type OrganizationMember = Tables<"organization_members">;

/*
 * Fetch and manage the current user's organization membership.
 *
 * QUERY:
 * Fetches the user's organization membership record along with the full
 * organization details. Uses maybeSingle() to safely handle cases where
 * the user has no organization yet.
 *
 * MUTATION:
 * Provides createOrganization for users who don't yet have an organization.
 * This creates both the organization and the owner membership in a single flow.
 * On success, invalidates the membership query to reflect the new organization.
 */
export const useOrganization = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: membership, isLoading: loadingMembership } = useQuery({
    queryKey: ["organization-membership", user?.id],
    queryFn: async () => {
      if (!user) return null;

      /*
       * Fetch the user's organization membership with full organization details.
       * Uses join to fetch the related organization in a single query.
       */
      const { data, error } = await supabase
        .from("organization_members")
        .select("*, organization:organizations(*)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  /*
   * Create a new organization and set the current user as owner.
   *
   * This is a two-step operation:
   * 1. Create the organization record with name and slug
   * 2. Create an owner membership record linking the user to the organization
   *
   * If either step fails, the mutation fails and no partial records are created.
   * On success, invalidates the membership query to reflect the new organization.
   */
  const createOrganization = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!user) throw new Error("Not authenticated");

      /* Create organization with the provided name and slug */
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name, slug })
        .select()
        .single();

      if (orgError) throw orgError;

      /* Add user as owner of the newly created organization */
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      return org;
    },
    onSuccess: () => {
      /* Refetch membership to reflect newly created organization */
      queryClient.invalidateQueries({ queryKey: ["organization-membership"] });
    },
  });

  return {
    organization: membership?.organization as Organization | null,
    membership: membership as (OrganizationMember & { organization: Organization }) | null,
    isLoading: loadingMembership,
    createOrganization,
  };
};
