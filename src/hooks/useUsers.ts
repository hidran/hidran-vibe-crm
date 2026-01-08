import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperadmin } from "./useIsSuperadmin";

export interface UserDetail {
  id: string | null; // organization_member id, null if not in org
  organization_id: string | null;
  user_id: string;
  role: string | null;
  created_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  full_name: string | null;
}

export const useUsers = (organizationId?: string) => {
  const { data: isSuperadmin } = useIsSuperadmin();

  return useQuery({
    queryKey: ["users", organizationId, isSuperadmin],
    queryFn: async () => {
      try {
        if (isSuperadmin && !organizationId) {
          // Use the database function to get all users with emails
          const { data, error } = await supabase.rpc("get_all_users");

          if (error) throw error;

          return (data || []).map((user: any) => ({
            id: user.id,
            organization_id: user.organization_id,
            user_id: user.user_id,
            role: user.role,
            created_at: user.created_at,
            email: user.email || "",
            first_name: user.first_name,
            last_name: user.last_name,
            organization_name: user.organization_name,
            full_name:
              user.first_name || user.last_name
                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                : null,
          })) as UserDetail[];
        } else if (organizationId) {
          // Use the database function to get organization members with emails
          const { data, error } = await supabase.rpc("get_organization_members", {
            _org_id: organizationId,
          });

          if (error) throw error;

          return (data || []).map((user: any) => ({
            id: user.id,
            organization_id: user.organization_id,
            user_id: user.user_id,
            role: user.role,
            created_at: user.created_at,
            email: user.email || "",
            first_name: user.first_name,
            last_name: user.last_name,
            organization_name: null,
            full_name:
              user.first_name || user.last_name
                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                : null,
          })) as UserDetail[];
        } else {
          return [];
        }
      } catch (error: any) {
        console.error("Network error fetching users:", error);
        throw new Error(error.message || "Failed to load users.");
      }
    },
    enabled: isSuperadmin !== undefined && (!!isSuperadmin || !!organizationId),
  });
};