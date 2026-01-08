import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MonthlyRevenue {
  month: string; // Format: "YYYY-MM"
  revenue: number;
  invoice_count: number;
}

export const useRevenueData = (
  organizationId: string | undefined,
  months: number = 12,
  isSuperadmin: boolean = false
) => {
  return useQuery({
    queryKey: ["revenue-data", organizationId, months, isSuperadmin],
    queryFn: async () => {
      // Calculate the date N months ago
      const nMonthsAgo = new Date();
      nMonthsAgo.setMonth(nMonthsAgo.getMonth() - months);
      const cutoffDate = nMonthsAgo.toISOString().split('T')[0];

      let query = supabase
        .from("invoices")
        .select("issue_date, total_amount")
        .eq("status", "paid")
        .gte("issue_date", cutoffDate)
        .order("issue_date", { ascending: false });

      // For superadmins without an organization, get all invoices
      // For regular users or superadmins with an organization, filter by organization
      if (!isSuperadmin || organizationId) {
        if (!organizationId) return [];
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by month and sum total_amount
      const revenueByMonth = new Map<string, { revenue: number; count: number }>();

      data?.forEach((invoice) => {
        if (invoice.issue_date && invoice.total_amount) {
          // Extract YYYY-MM from issue_date
          const month = invoice.issue_date.substring(0, 7);
          const existing = revenueByMonth.get(month) || { revenue: 0, count: 0 };
          revenueByMonth.set(month, {
            revenue: existing.revenue + invoice.total_amount,
            count: existing.count + 1,
          });
        }
      });

      // Convert to array and sort by month descending
      const result: MonthlyRevenue[] = Array.from(revenueByMonth.entries())
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          invoice_count: data.count,
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      return result;
    },
    enabled: isSuperadmin || !!organizationId,
    // Cache results for 1 minute since revenue data changes less frequently
    staleTime: 60 * 1000,
    // Keep data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry failed requests up to 2 times
    retry: 2,
  });
};
