import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Organization = Tables<"organizations">;
type OrganizationInsert = TablesInsert<"organizations">;
type OrganizationUpdate = TablesUpdate<"organizations">;

export interface OrganizationWithStats extends Organization {
  member_count: number;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: {
    email: string;
    full_name: string | null;
  };
}

// Subtask 4.1: Query all organizations with member counts
export const useOrganizations = (isSuperadmin: boolean) => {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      try {
        // Query organizations with member counts using LEFT JOIN
        const { data, error } = await supabase
          .from("organizations")
          .select(`
            *,
            organization_members(count)
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching organizations:", error);
          throw new Error(`Failed to load organizations: ${error.message}`);
        }

        // Transform the data to include member_count
        const organizations: OrganizationWithStats[] = (data || []).map((org: any) => ({
          ...org,
          member_count: org.organization_members?.[0]?.count || 0,
        }));

        return organizations;
      } catch (error: any) {
        console.error("Network error fetching organizations:", error);
        throw new Error(error.message || "Failed to connect to the server. Please check your internet connection.");
      }
    },
    enabled: isSuperadmin, // Only enable query for superadmins
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Helper to create URL-friendly slugs
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-')   // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start
    .replace(/-+$/, '');      // Trim - from end
};

// Subtask 4.2: Create new organization
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organization: Omit<OrganizationInsert, "slug"> & { slug?: string }) => {
      try {
        // Validate name is not empty
        if (!organization.name || organization.name.trim() === "") {
          throw new Error("Organization name cannot be empty");
        }

        // Generate slug if not provided
        const slug = organization.slug || slugify(organization.name);

        // Prepare the object for insertion
        const orgToInsert: OrganizationInsert = {
          ...organization,
          slug,
        };

        const { data, error } = await supabase
          .from("organizations")
          .insert(orgToInsert)
          .select()
          .single();

        if (error) {
          console.error("Error creating organization:", error);

          // Handle specific database errors
          if (error.code === "23505") {
            throw new Error("An organization with this name already exists");
          }

          throw new Error(`Failed to create organization: ${error.message}`);
        }

        return data as Organization;
      } catch (error: any) {
        console.error("Network error creating organization:", error);

        // Re-throw validation errors as-is
        if (error.message.includes("cannot be empty") || error.message.includes("already exists")) {
          throw error;
        }

        throw new Error(error.message || "Failed to create organization. Please try again.");
      }
    },
    onSuccess: () => {
      // Invalidate organizations query on success
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
};

// Subtask 4.3: Update organization
export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OrganizationUpdate & { id: string }) => {
      try {
        // Validate name uniqueness if name is being updated
        if (updates.name) {
          const trimmedName = updates.name.trim();

          if (trimmedName === "") {
            throw new Error("Organization name cannot be empty");
          }

          // Check if another organization already has this name
          const { data: existingOrgs, error: checkError } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("name", trimmedName)
            .neq("id", id);

          if (checkError) {
            console.error("Error checking organization name uniqueness:", checkError);
            throw new Error("Failed to validate organization name. Please try again.");
          }

          if (existingOrgs && existingOrgs.length > 0) {
            throw new Error("An organization with this name already exists");
          }
        }

        // Update the organization
        const { data, error } = await supabase
          .from("organizations")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("Error updating organization:", error);

          // Handle specific database errors
          if (error.code === "23505") {
            throw new Error("An organization with this name already exists");
          }

          throw new Error(`Failed to update organization: ${error.message}`);
        }

        return data as Organization;
      } catch (error: any) {
        console.error("Network error updating organization:", error);

        // Re-throw validation errors as-is
        if (error.message.includes("cannot be empty") || error.message.includes("already exists") || error.message.includes("validate")) {
          throw error;
        }

        throw new Error(error.message || "Failed to update organization. Please try again.");
      }
    },
    onSuccess: () => {
      // Invalidate organizations query on success
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
};

// Subtask 4.4: Delete organization
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        // Delete the organization
        // Cascade deletion is handled by database foreign key constraints
        const { error } = await supabase
          .from("organizations")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Error deleting organization:", error);

          // Handle specific database errors
          if (error.code === "23503") {
            throw new Error("Cannot delete organization: it has related data that must be removed first");
          }

          throw new Error(`Failed to delete organization: ${error.message}`);
        }

        return id;
      } catch (error: any) {
        console.error("Network error deleting organization:", error);

        // Re-throw specific errors as-is
        if (error.message.includes("related data")) {
          throw error;
        }

        throw new Error(error.message || "Failed to delete organization. Please try again.");
      }
    },
    onSuccess: () => {
      // Invalidate organizations query on success
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
};

// Subtask 4.5: Query members for specific organization
export const useOrganizationMembers = (organizationId: string) => {
  return useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: async () => {
      try {
        // Get organization members
        const { data: members, error } = await supabase
          .from("organization_members")
          .select(`
            id,
            organization_id,
            user_id,
            role,
            created_at
          `)
          .eq("organization_id", organizationId);

        if (error) {
          console.error("Error fetching organization members:", error);
          throw new Error(`Failed to load organization members: ${error.message}`);
        }

        // Get profiles for all users
        const userIds = [...new Set((members || []).map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Transform the data to match OrganizationMember interface
        const result: OrganizationMember[] = (members || []).map((member) => {
          const profile = profileMap.get(member.user_id);
          return {
            id: member.id,
            organization_id: member.organization_id,
            user_id: member.user_id,
            role: member.role,
            created_at: member.created_at,
            profile: {
              email: "", // Email not accessible from client
              full_name: profile?.first_name || profile?.last_name
                ? `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || null
                : null,
            },
          };
        });

        return result;
      } catch (error: any) {
        console.error("Network error fetching organization members:", error);
        throw new Error(error.message || "Failed to connect to the server. Please check your internet connection.");
      }
    },
    enabled: !!organizationId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
