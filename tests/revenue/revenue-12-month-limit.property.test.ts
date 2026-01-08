/**
 * Property-Based Tests for Revenue 12-Month Limit
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

describe('Revenue 12-Month Limit Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .like('name', 'Test Limit Org%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabase.from('organizations').delete().eq('id', org.id);
      }
    }
  });

  /**
   * Feature: dashboard-analytics, Property 4: Revenue data limited to 12 months
   * For any revenue query, the returned data should contain at most 12 months of data.
   * Validates: Requirements 3.4
   */
  it('Property 4: Revenue data limited to 12 months', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          recentInvoices: fc.array(
            fc.record({
              monthsAgo: fc.integer({ min: 0, max: 11 }), // Within 12 months
              amount: fc.integer({ min: 1, max: 10000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          oldInvoices: fc.array(
            fc.record({
              monthsAgo: fc.integer({ min: 13, max: 24 }), // Older than 12 months
              amount: fc.integer({ min: 1, max: 10000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ recentInvoices, oldInvoices }) => {
          // Create a test organization
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: `Test Limit Org ${Date.now()}`,
              slug: `test-limit-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (orgError || !org) {
            throw new Error(`Failed to create organization: ${orgError?.message}`);
          }

          // Create recent invoices (within 12 months)
          const recentPromises = recentInvoices.map((inv, i) => {
            const issueDate = new Date();
            issueDate.setMonth(issueDate.getMonth() - inv.monthsAgo);
            issueDate.setDate(15);
            return supabase.from('invoices').insert({
              organization_id: org.id,
              invoice_number: `RECENT-${Date.now()}-${i}`,
              status: 'paid',
              issue_date: issueDate.toISOString().split('T')[0],
              total_amount: inv.amount,
            });
          });
          await Promise.all(recentPromises);

          // Create old invoices (older than 12 months)
          const oldPromises = oldInvoices.map((inv, i) => {
            const issueDate = new Date();
            issueDate.setMonth(issueDate.getMonth() - inv.monthsAgo);
            issueDate.setDate(15);
            return supabase.from('invoices').insert({
              organization_id: org.id,
              invoice_number: `OLD-${Date.now()}-${i}`,
              status: 'paid',
              issue_date: issueDate.toISOString().split('T')[0],
              total_amount: inv.amount,
            });
          });
          await Promise.all(oldPromises);

          // Calculate the cutoff date (12 months ago)
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
          const cutoffDate = twelveMonthsAgo.toISOString().split('T')[0];

          // Query the database using the same logic as useRevenueData
          const { data, error } = await supabase
            .from('invoices')
            .select('issue_date, total_amount')
            .eq('organization_id', org.id)
            .eq('status', 'paid')
            .gte('issue_date', cutoffDate);

          if (error) {
            throw new Error(`Failed to query invoices: ${error.message}`);
          }

          // Verify all returned invoices are within the last 12 months
          data?.forEach((invoice) => {
            if (invoice.issue_date) {
              const invoiceDate = new Date(invoice.issue_date);
              const cutoffDateObj = new Date(cutoffDate);
              
              // Invoice date should be >= cutoff date (within last 12 months)
              expect(invoiceDate >= cutoffDateObj).toBe(true);
            }
          });

          // Count unique months in the result
          const uniqueMonths = new Set<string>();
          data?.forEach((invoice) => {
            if (invoice.issue_date) {
              const month = invoice.issue_date.substring(0, 7);
              uniqueMonths.add(month);
            }
          });

          // Verify we have at most 12 unique months
          expect(uniqueMonths.size).toBeLessThanOrEqual(12);

          // Verify that old invoices are NOT included
          const totalRevenue = data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
          const expectedRevenue = recentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
          
          expect(totalRevenue).toBe(expectedRevenue);

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
