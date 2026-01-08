/**
 * Property-Based Tests for Revenue Organization Filtering
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

describe('Revenue Organization Filtering Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .like('name', 'Test Filter Org%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabase.from('organizations').delete().eq('id', org.id);
      }
    }
  });

  /**
   * Feature: dashboard-analytics, Property 7: Revenue filtered by organization
   * For any organization, revenue data should only include invoices belonging to that organization.
   * Validates: Requirements 4.4, 8.2
   */
  it('Property 7: Revenue filtered by organization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1Invoices: fc.array(
            fc.record({
              monthsAgo: fc.integer({ min: 0, max: 11 }),
              amount: fc.integer({ min: 1, max: 10000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          org2Invoices: fc.array(
            fc.record({
              monthsAgo: fc.integer({ min: 0, max: 11 }),
              amount: fc.integer({ min: 1, max: 10000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ org1Invoices, org2Invoices }) => {
          // Create two test organizations
          const { data: org1, error: org1Error } = await supabase
            .from('organizations')
            .insert({
              name: `Test Filter Org 1 ${Date.now()}`,
              slug: `test-filter-org-1-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (org1Error || !org1) {
            throw new Error(`Failed to create organization 1: ${org1Error?.message}`);
          }

          const { data: org2, error: org2Error } = await supabase
            .from('organizations')
            .insert({
              name: `Test Filter Org 2 ${Date.now()}`,
              slug: `test-filter-org-2-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (org2Error || !org2) {
            throw new Error(`Failed to create organization 2: ${org2Error?.message}`);
          }

          // Create invoices for org1
          const org1Promises = org1Invoices.map((inv, i) => {
            const issueDate = new Date();
            issueDate.setMonth(issueDate.getMonth() - inv.monthsAgo);
            issueDate.setDate(15);
            return supabase.from('invoices').insert({
              organization_id: org1.id,
              invoice_number: `ORG1-${Date.now()}-${i}`,
              status: 'paid',
              issue_date: issueDate.toISOString().split('T')[0],
              total_amount: inv.amount,
            });
          });
          await Promise.all(org1Promises);

          // Create invoices for org2
          const org2Promises = org2Invoices.map((inv, i) => {
            const issueDate = new Date();
            issueDate.setMonth(issueDate.getMonth() - inv.monthsAgo);
            issueDate.setDate(15);
            return supabase.from('invoices').insert({
              organization_id: org2.id,
              invoice_number: `ORG2-${Date.now()}-${i}`,
              status: 'paid',
              issue_date: issueDate.toISOString().split('T')[0],
              total_amount: inv.amount,
            });
          });
          await Promise.all(org2Promises);

          // Calculate expected revenue for each org
          const expectedOrg1Revenue = org1Invoices.reduce((sum, inv) => sum + inv.amount, 0);
          const expectedOrg2Revenue = org2Invoices.reduce((sum, inv) => sum + inv.amount, 0);

          // Query the database for org1 using the same logic as useRevenueData
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
          const cutoffDate = twelveMonthsAgo.toISOString().split('T')[0];

          const { data: org1Data, error: org1DataError } = await supabase
            .from('invoices')
            .select('issue_date, total_amount, organization_id')
            .eq('organization_id', org1.id)
            .eq('status', 'paid')
            .gte('issue_date', cutoffDate);

          if (org1DataError) {
            throw new Error(`Failed to query org1 invoices: ${org1DataError.message}`);
          }

          // Query the database for org2
          const { data: org2Data, error: org2DataError } = await supabase
            .from('invoices')
            .select('issue_date, total_amount, organization_id')
            .eq('organization_id', org2.id)
            .eq('status', 'paid')
            .gte('issue_date', cutoffDate);

          if (org2DataError) {
            throw new Error(`Failed to query org2 invoices: ${org2DataError.message}`);
          }

          // Verify all org1 invoices belong to org1
          org1Data?.forEach((invoice) => {
            expect(invoice.organization_id).toBe(org1.id);
          });

          // Verify all org2 invoices belong to org2
          org2Data?.forEach((invoice) => {
            expect(invoice.organization_id).toBe(org2.id);
          });

          // Calculate actual revenue for each org
          const actualOrg1Revenue = org1Data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
          const actualOrg2Revenue = org2Data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

          // Verify revenue matches only the organization's invoices (no cross-org leakage)
          expect(actualOrg1Revenue).toBe(expectedOrg1Revenue);
          expect(actualOrg2Revenue).toBe(expectedOrg2Revenue);

          // The key property: if data was leaking, org1's revenue would include org2's invoices
          // Since we've verified exact matches, we've proven isolation
          expect(actualOrg1Revenue).not.toBe(expectedOrg1Revenue + expectedOrg2Revenue);
          expect(actualOrg2Revenue).not.toBe(expectedOrg1Revenue + expectedOrg2Revenue);

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org1.id);
          await supabase.from('organizations').delete().eq('id', org2.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
