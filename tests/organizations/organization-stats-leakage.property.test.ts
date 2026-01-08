/**
 * Property-Based Tests for Cross-Organization Data Leakage Prevention
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

describe('Cross-Organization Data Leakage Prevention Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .like('name', 'Test Org%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabase.from('organizations').delete().eq('id', org.id);
      }
    }
  });

  /**
   * Feature: dashboard-analytics, Property 11: No cross-organization data leakage
   * For any two different organizations, the statistics and revenue data for one organization
   * should never include data from the other organization.
   * Validates: Requirements 8.5
   */
  it('Property 11: No cross-organization data leakage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1Data: fc.record({
            clients: fc.integer({ min: 1, max: 5 }),
            projects: fc.integer({ min: 1, max: 5 }),
            tasks: fc.integer({ min: 1, max: 5 }),
            invoices: fc.integer({ min: 1, max: 5 }),
          }),
          org2Data: fc.record({
            clients: fc.integer({ min: 1, max: 5 }),
            projects: fc.integer({ min: 1, max: 5 }),
            tasks: fc.integer({ min: 1, max: 5 }),
            invoices: fc.integer({ min: 1, max: 5 }),
          }),
        }),
        async ({ org1Data, org2Data }) => {
          // Create two separate organizations
          const { data: org1, error: org1Error } = await supabase
            .from('organizations')
            .insert({
              name: `Test Org 1 ${Date.now()}`,
              slug: `test-org-1-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (org1Error || !org1) {
            throw new Error(`Failed to create organization 1: ${org1Error?.message}`);
          }

          const { data: org2, error: org2Error } = await supabase
            .from('organizations')
            .insert({
              name: `Test Org 2 ${Date.now()}`,
              slug: `test-org-2-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (org2Error || !org2) {
            throw new Error(`Failed to create organization 2: ${org2Error?.message}`);
          }

          // Create data for org1
          const org1ClientPromises = Array.from({ length: org1Data.clients }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org1.id,
              name: `Org1 Client ${i}`,
              email: `org1-client${i}@test.com`,
            })
          );
          await Promise.all(org1ClientPromises);

          const org1ProjectPromises = Array.from({ length: org1Data.projects }, (_, i) =>
            supabase.from('projects').insert({
              organization_id: org1.id,
              name: `Org1 Project ${i}`,
            })
          );
          await Promise.all(org1ProjectPromises);

          const org1TaskPromises = Array.from({ length: org1Data.tasks }, (_, i) =>
            supabase.from('tasks').insert({
              organization_id: org1.id,
              title: `Org1 Task ${i}`,
            })
          );
          await Promise.all(org1TaskPromises);

          const org1InvoicePromises = Array.from({ length: org1Data.invoices }, (_, i) =>
            supabase.from('invoices').insert({
              organization_id: org1.id,
              invoice_number: `ORG1-INV-${Date.now()}-${i}`,
              total_amount: 100,
            })
          );
          await Promise.all(org1InvoicePromises);

          // Create data for org2
          const org2ClientPromises = Array.from({ length: org2Data.clients }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org2.id,
              name: `Org2 Client ${i}`,
              email: `org2-client${i}@test.com`,
            })
          );
          await Promise.all(org2ClientPromises);

          const org2ProjectPromises = Array.from({ length: org2Data.projects }, (_, i) =>
            supabase.from('projects').insert({
              organization_id: org2.id,
              name: `Org2 Project ${i}`,
            })
          );
          await Promise.all(org2ProjectPromises);

          const org2TaskPromises = Array.from({ length: org2Data.tasks }, (_, i) =>
            supabase.from('tasks').insert({
              organization_id: org2.id,
              title: `Org2 Task ${i}`,
            })
          );
          await Promise.all(org2TaskPromises);

          const org2InvoicePromises = Array.from({ length: org2Data.invoices }, (_, i) =>
            supabase.from('invoices').insert({
              organization_id: org2.id,
              invoice_number: `ORG2-INV-${Date.now()}-${i}`,
              total_amount: 200,
            })
          );
          await Promise.all(org2InvoicePromises);

          // Query stats for org1
          const { data: stats1, error: stats1Error } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org1.id)
            .single();

          if (stats1Error) {
            throw new Error(`Failed to query stats for org1: ${stats1Error.message}`);
          }

          // Query stats for org2
          const { data: stats2, error: stats2Error } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org2.id)
            .single();

          if (stats2Error) {
            throw new Error(`Failed to query stats for org2: ${stats2Error.message}`);
          }

          // Critical property: org1 stats should ONLY contain org1 data
          expect(stats1.clients_count).toBe(org1Data.clients);
          expect(stats1.projects_count).toBe(org1Data.projects);
          expect(stats1.tasks_count).toBe(org1Data.tasks);
          expect(stats1.invoices_count).toBe(org1Data.invoices);

          // Critical property: org2 stats should ONLY contain org2 data
          expect(stats2.clients_count).toBe(org2Data.clients);
          expect(stats2.projects_count).toBe(org2Data.projects);
          expect(stats2.tasks_count).toBe(org2Data.tasks);
          expect(stats2.invoices_count).toBe(org2Data.invoices);

          // Additional verification: if there was leakage, org1's counts would be
          // org1Data + org2Data, not just org1Data
          // We can verify this by checking that the sum of both orgs' stats
          // equals the total data we created
          const totalClients = stats1.clients_count + stats2.clients_count;
          const totalProjects = stats1.projects_count + stats2.projects_count;
          const totalTasks = stats1.tasks_count + stats2.tasks_count;
          const totalInvoices = stats1.invoices_count + stats2.invoices_count;

          expect(totalClients).toBe(org1Data.clients + org2Data.clients);
          expect(totalProjects).toBe(org1Data.projects + org2Data.projects);
          expect(totalTasks).toBe(org1Data.tasks + org2Data.tasks);
          expect(totalInvoices).toBe(org1Data.invoices + org2Data.invoices);

          // The property holds: no data leakage between organizations
          // Each organization sees only its own data

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org1.id);
          await supabase.from('organizations').delete().eq('id', org2.id);
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);
});
