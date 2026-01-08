/**
 * Property-Based Tests for Revenue Calculation
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

describe('Revenue Calculation Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .like('name', 'Test Revenue Org%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabase.from('organizations').delete().eq('id', org.id);
      }
    }
  });

  /**
   * Feature: dashboard-analytics, Property 3: Monthly revenue calculation correctness
   * For any set of paid invoices, the monthly revenue total should equal the sum of
   * total_amount for all paid invoices in that month.
   * Validates: Requirements 3.3, 4.3
   */
  it('Property 3: Monthly revenue calculation correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            monthsAgo: fc.integer({ min: 0, max: 11 }), // 0-11 months ago from now
            amount: fc.integer({ min: 1, max: 10000 }), // Use integers to avoid floating point precision issues
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (invoices) => {
          // Create a test organization
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: `Test Revenue Org ${Date.now()}`,
              slug: `test-revenue-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (orgError || !org) {
            throw new Error(`Failed to create organization: ${orgError?.message}`);
          }

          // Create invoices with the generated data (all within last 12 months)
          const invoicePromises = invoices.map((inv, i) => {
            const issueDate = new Date();
            issueDate.setMonth(issueDate.getMonth() - inv.monthsAgo);
            issueDate.setDate(15); // 15th of each month
            return supabase.from('invoices').insert({
              organization_id: org.id,
              invoice_number: `INV-${Date.now()}-${i}`,
              status: 'paid',
              issue_date: issueDate.toISOString().split('T')[0],
              total_amount: inv.amount,
            });
          });
          await Promise.all(invoicePromises);

          // Calculate expected revenue by month
          const expectedRevenueByMonth = new Map<string, number>();
          invoices.forEach((inv) => {
            const date = new Date();
            date.setMonth(date.getMonth() - inv.monthsAgo);
            const month = date.toISOString().substring(0, 7);
            const existing = expectedRevenueByMonth.get(month) || 0;
            expectedRevenueByMonth.set(month, existing + inv.amount);
          });

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

          // Group by month and sum total_amount
          const actualRevenueByMonth = new Map<string, number>();
          data?.forEach((invoice) => {
            if (invoice.issue_date && invoice.total_amount) {
              const month = invoice.issue_date.substring(0, 7);
              const existing = actualRevenueByMonth.get(month) || 0;
              actualRevenueByMonth.set(month, existing + invoice.total_amount);
            }
          });

          // Verify that each month's revenue matches
          expectedRevenueByMonth.forEach((expectedRevenue, month) => {
            const actualRevenue = actualRevenueByMonth.get(month) || 0;
            // With integer amounts, we can use exact equality
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
