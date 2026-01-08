import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationStats {
  organization_id: string;
  clients_count: number;
  projects_count: number;
  tasks_count: number;
  invoices_count: number;
}

export const useOrganizationStats = (
  organizationId: string | undefined,
  isSuperadmin: boolean = false
) => {
  return useQuery({
    queryKey: ["organization-stats", organizationId, isSuperadmin],
    queryFn: async () => {
      // For superadmins without an organization, aggregate all stats
      if (isSuperadmin && !organizationId) {
        // Query stats directly from individual tables for superadmin global view
        const [clientsRes, projectsRes, tasksRes, invoicesRes] = await Promise.all([
          supabase.from("clients").select("id", { count: "exact", head: true }),
          supabase.from("projects").select("id", { count: "exact", head: true }),
          supabase.from("tasks").select("id", { count: "exact", head: true }),
          supabase.from("invoices").select("id", { count: "exact", head: true }),
        ]);

        return {
          organization_id: "all",
          clients_count: clientsRes.count || 0,
          projects_count: projectsRes.count || 0,
          tasks_count: tasksRes.count || 0,
          invoices_count: invoicesRes.count || 0,
        } as OrganizationStats;
      }

      if (!organizationId) return null;

      // Query stats for a specific organization
      const [clientsRes, projectsRes, tasksRes, invoicesRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
      ]);

      return {
        organization_id: organizationId,
        clients_count: clientsRes.count || 0,
        projects_count: projectsRes.count || 0,
        tasks_count: tasksRes.count || 0,
        invoices_count: invoicesRes.count || 0,
      } as OrganizationStats;
    },
    enabled: isSuperadmin || !!organizationId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
};
