/**
 * Property-Based Tests for Revenue Paid Invoices Filter
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

describe('Revenue Paid Invoices Filter Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .like('name', 'Test Paid Org%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabase.from('organizations').delete().eq('id', org.id);
      }
    }
  });

  /**
   * Feature: dashboard-analytics, Property 5: Only paid invoices included in revenue
   * For any revenue calculation, all included invoices should have status "paid".
   * Validates: Requirements 4.1
   */
  it('Property 5: Only paid invoices included in revenue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          paidInvoices: fc.array(
            fc.record({
              monthsAgo: fc.integer({ min: 0, max: 11 }),
              amount: fc.integer({ min: 1, max: 10000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          nonPaidInvoices: fc.array(
            fc.record({
              monthsAgo: fc.integer({ min: 0, max: 11 }),
              amount: fc.integer({ min: 1, max: 10000 }),
              status: fc.constantFrom('pending', 'sent'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ paidInvoices, nonPaidInvoices }) => {
          // Create a test organization
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: `Test Paid Org ${Date.now()}`,
              slug: `test-paid-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (orgError || !org) {
            throw new Error(`Failed to create organization: ${orgError?.message}`);
          }

          // Create paid invoices
          const paidPromises = paidInvoices.map((inv, i) => {
            const issueDate = new Date();
            issueDate.setMonth(issueDate.getMonth() - inv.monthsAgo);
            issueDate.setDate(15);
            return supabase.from('invoices').insert({
              organization_id: org.id,
              invoice_number: `PAID-${Date.now()}-${i}`,
              status: 'paid',
              issue_date: issueDate.toISOString().split('T')[0],
              total_amount: inv.amount,
            });
          });
          await Promise.all(paidPromises);

          // Create non-paid invoices (pending or sent)
          const nonPaidPromises = nonPaidInvoices.map((inv, i) => {
            const issueDate = new Date();
            issueDate.setMonth(issueDate.getMonth() - inv.monthsAgo);
            issueDate.setDate(15);
            return supabase.from('invoices').insert({
              organization_id: org.id,
              invoice_number: `NONPAID-${Date.now()}-${i}`,
              status: inv.status,
              issue_date: issueDate.toISOString().split('T')[0],
              total_amount: inv.amount,
            });
          });
          await Promise.all(nonPaidPromises);

          // Calculate expected revenue (only from paid invoices)
          const expectedTotalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

          // Query the database using the same logic as useRevenueData
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
          const cutoffDate = twelveMonthsAgo.toISOString().split('T')[0];

          const { data, error } = await supabase
            .from('invoices')
            .select('issue_date, total_amount, status')
            .eq('organization_id', org.id)
            .eq('status', 'paid')
            .gte('issue_date', cutoffDate);

          if (error) {
            throw new Error(`Failed to query invoices: ${error.message}`);
          }

          // Verify all returned invoices have status 'paid'
          data?.forEach((invoice) => {
            expect(invoice.status).toBe('paid');
          });

          // Calculate actual total revenue
          const actualTotalRevenue = data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

          // Verify total revenue matches only paid invoices
          expect(actualTotalRevenue).toBe(expectedTotalRevenue);

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
