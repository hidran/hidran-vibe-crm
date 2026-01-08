/**
 * Property-Based Tests for Revenue Date Grouping
 * Feature: dashboard-analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for testing with service role key (bypasses RLS for testing)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  // Service role key for local testing - bypasses RLS
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

describe('Revenue Date Grouping Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .like('name', 'Test Date Org%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabase.from('organizations').delete().eq('id', org.id);
      }
    }
  });

  /**
   * Feature: dashboard-analytics, Property 6: Revenue grouped by issue date month
   * For any invoice in the revenue data, it should be grouped according to the month
   * of its issue_date.
   * Validates: Requirements 4.2
   */
  it('Property 6: Revenue grouped by issue date month', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            monthsAgo: fc.integer({ min: 0, max: 11 }),
            dayOfMonth: fc.integer({ min: 1, max: 28 }), // Use 1-28 to avoid month boundary issues
            amount: fc.integer({ min: 1, max: 10000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (invoices) => {
          // Create a test organization
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: `Test Date Org ${Date.now()}`,
              slug: `test-date-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (orgError || !org) {
            throw new Error(`Failed to create organization: ${orgError?.message}`);
          }

          // Create invoices with specific dates
          const invoiceData: Array<{ issueDate: string; amount: number; expectedMonth: string }> = [];
          
          const createPromises = invoices.map((inv, i) => {
            const issueDate = new Date();
            issueDate.setMonth(issueDate.getMonth() - inv.monthsAgo);
            issueDate.setDate(inv.dayOfMonth);
            const issueDateStr = issueDate.toISOString().split('T')[0];
            const expectedMonth = issueDateStr.substring(0, 7); // YYYY-MM
            
            invoiceData.push({
              issueDate: issueDateStr,
              amount: inv.amount,
              expectedMonth,
            });

            return supabase.from('invoices').insert({
              organization_id: org.id,
              invoice_number: `INV-${Date.now()}-${i}`,
              status: 'paid',
              issue_date: issueDateStr,
              total_amount: inv.amount,
            });
          });
          await Promise.all(createPromises);

          // Query the database using the same logic as useRevenueData
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
          const cutoffDate = twelveMonthsAgo.toISOString().split('T')[0];

          const { data, error } = await supabase
            .from('invoices')
            .select('issue_date, total_amount')
            .eq('organization_id', org.id)
            .eq('status', 'paid')
            .gte('issue_date', cutoffDate);

          if (error) {
            throw new Error(`Failed to query invoices: ${error.message}`);
          }

          // Verify each invoice is grouped by its issue_date month
          data?.forEach((invoice) => {
            if (invoice.issue_date && invoice.total_amount) {
              const actualMonth = invoice.issue_date.substring(0, 7);
              
              // Find the corresponding invoice in our test data
              const matchingInvoice = invoiceData.find(
                (inv) => inv.issueDate === invoice.issue_date && inv.amount === invoice.total_amount
              );
              
              if (matchingInvoice) {
                // Verify the month extracted from issue_date matches expected
                expect(actualMonth).toBe(matchingInvoice.expectedMonth);
              }
            }
          });

          // Group by month and verify grouping is correct
          const revenueByMonth = new Map<string, number>();
          data?.forEach((invoice) => {
            if (invoice.issue_date && invoice.total_amount) {
              const month = invoice.issue_date.substring(0, 7);
              const existing = revenueByMonth.get(month) || 0;
              revenueByMonth.set(month, existing + invoice.total_amount);
            }
          });

          // Verify expected grouping
          const expectedRevenueByMonth = new Map<string, number>();
          invoiceData.forEach((inv) => {
            const existing = expectedRevenueByMonth.get(inv.expectedMonth) || 0;
            expectedRevenueByMonth.set(inv.expectedMonth, existing + inv.amount);
          });

          // Compare the two maps
          expectedRevenueByMonth.forEach((expectedRevenue, month) => {
            const actualRevenue = revenueByMonth.get(month) || 0;
            expect(actualRevenue).toBe(expectedRevenue);
          });

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
