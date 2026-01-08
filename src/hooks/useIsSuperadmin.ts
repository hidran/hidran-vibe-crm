/*
 * useIsSuperadmin - Hook to check if current user has superadmin privileges
 *
 * This hook determines whether the authenticated user has superadmin role,
 * which grants access to cross-organization features and administrative
 * capabilities that regular users don't have.
 *
 * SUPERADMIN PRIVILEGES:
 * - Can view and manage all organizations
 * - Can access organization management pages (/organizations)
 * - Can see users across all organizations
 * - Has full access to all CRM data
 *
 * IMPLEMENTATION:
 * Uses the is_superadmin() database function to check the user_roles table.
 * This ensures role checks are consistent across the application and enforced
 * at the database level via RLS policies.
 *
 * CACHE BEHAVIOR:
 * - Query is cached per user (queryKey includes user.id)
 * - Only runs when user is authenticated (enabled: !!user)
 * - Returns false on error to fail closed (deny access by default)
 * - Cached indefinitely until user signs out (AuthContext clears cache)
 *
 * ERROR HANDLING:
 * - Logs errors to console for debugging
 * - Returns false on any error (safe default - no admin access)
 * - Does not throw (prevents breaking UI if database is temporarily unavailable)
 *
 * USAGE:
 *   const { data: isSuperadmin, isLoading } = useIsSuperadmin();
 *   if (isSuperadmin) { // show admin UI }
 *
 * NOTE: Always check isLoading before using isSuperadmin value to avoid
 * flickering UI or showing wrong content during initial load.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useIsSuperadmin = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-superadmin", user?.id],
    queryFn: async () => {
      if (!user) return false;

      /*
       * Call database function to check superadmin status
       *
       * The is_superadmin() function queries the user_roles table to determine
       * if the user has the 'superadmin' role. This approach centralizes the
       * role checking logic in the database, ensuring consistency across
       * application features and RLS policies.
       *
       * SECURITY: The function has SECURITY DEFINER, allowing it to query
       * user_roles even if the calling user doesn't have direct access.
       * This is safe because the function only returns a boolean and requires
       * a valid user_id parameter.
       */
      const { data, error } = await supabase
        .rpc("is_superadmin", { _user_id: user.id });

      if (error) {
        console.error("Error checking superadmin status:", error);
        /* Return false on error - fail closed for security */
        return false;
      }

      /* data is boolean | null, default to false if null */
      return data ?? false;
    },
    enabled: !!user, // Only run query when user is authenticated
  });
};
