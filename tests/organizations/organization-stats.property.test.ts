/**
 * Property-Based Tests for Organization Statistics
 * Feature: dashboard-analytics
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('Organization Statistics Property Tests', () => {
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
   * Feature: dashboard-analytics, Property 1: Statistics counts match database reality
   * For any organization, the displayed counts for clients, projects, tasks, and invoices
   * should exactly match the actual counts in the database for that organization.
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4
   */
  it('Property 1: Statistics counts match database reality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clientsCount: fc.integer({ min: 0, max: 10 }),
          projectsCount: fc.integer({ min: 0, max: 10 }),
          tasksCount: fc.integer({ min: 0, max: 10 }),
          invoicesCount: fc.integer({ min: 0, max: 10 }),
        }),
        async (counts) => {
          // Create a test organization
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: `Test Org ${Date.now()}`,
              slug: `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (orgError || !org) {
            throw new Error(`Failed to create organization: ${orgError?.message}`);
          }

          // Create clients
          const clientPromises = Array.from({ length: counts.clientsCount }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org.id,
              name: `Test Client ${i}`,
              email: `client${i}@test.com`,
            })
          );
          await Promise.all(clientPromises);

          // Create projects
          const projectPromises = Array.from({ length: counts.projectsCount }, (_, i) =>
            supabase.from('projects').insert({
              organization_id: org.id,
              name: `Test Project ${i}`,
            })
          );
          await Promise.all(projectPromises);

          // Create tasks
          const taskPromises = Array.from({ length: counts.tasksCount }, (_, i) =>
            supabase.from('tasks').insert({
              organization_id: org.id,
              title: `Test Task ${i}`,
            })
          );
          await Promise.all(taskPromises);

          // Create invoices
          const invoicePromises = Array.from({ length: counts.invoicesCount }, (_, i) =>
            supabase.from('invoices').insert({
              organization_id: org.id,
              invoice_number: `INV-${Date.now()}-${i}`,
              total_amount: 100,
            })
          );
          await Promise.all(invoicePromises);

          // Query the organization_stats view
          const { data: stats, error: statsError } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org.id)
            .single();

          if (statsError) {
            throw new Error(`Failed to query stats: ${statsError.message}`);
          }

          // Verify counts match
          expect(stats.clients_count).toBe(counts.clientsCount);
          expect(stats.projects_count).toBe(counts.projectsCount);
          expect(stats.tasks_count).toBe(counts.tasksCount);
          expect(stats.invoices_count).toBe(counts.invoicesCount);

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: dashboard-analytics, Property 2: SQL view respects organization boundaries
   * For any organization, querying the organization_stats view should return only data
   * belonging to that organization.
   * Validates: Requirements 2.2, 8.1, 8.3
   */
  it('Property 2: SQL view respects organization boundaries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1Data: fc.record({
            clientsCount: fc.integer({ min: 1, max: 5 }),
            projectsCount: fc.integer({ min: 1, max: 5 }),
          }),
          org2Data: fc.record({
            clientsCount: fc.integer({ min: 1, max: 5 }),
            projectsCount: fc.integer({ min: 1, max: 5 }),
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
          const org1ClientPromises = Array.from({ length: org1Data.clientsCount }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org1.id,
              name: `Org1 Client ${i}`,
              email: `org1-client${i}@test.com`,
            })
          );
          await Promise.all(org1ClientPromises);

          const org1ProjectPromises = Array.from({ length: org1Data.projectsCount }, (_, i) =>
            supabase.from('projects').insert({
              organization_id: org1.id,
              name: `Org1 Project ${i}`,
            })
          );
          await Promise.all(org1ProjectPromises);

          // Create data for org2
          const org2ClientPromises = Array.from({ length: org2Data.clientsCount }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org2.id,
              name: `Org2 Client ${i}`,
              email: `org2-client${i}@test.com`,
            })
          );
          await Promise.all(org2ClientPromises);

          const org2ProjectPromises = Array.from({ length: org2Data.projectsCount }, (_, i) =>
            supabase.from('projects').insert({
              organization_id: org2.id,
              name: `Org2 Project ${i}`,
            })
          );
          await Promise.all(org2ProjectPromises);

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

          // Verify org1 stats match only org1 data (not org1 + org2)
          expect(stats1.clients_count).toBe(org1Data.clientsCount);
          expect(stats1.projects_count).toBe(org1Data.projectsCount);
          expect(stats1.tasks_count).toBe(0);
          expect(stats1.invoices_count).toBe(0);

          // Verify org2 stats match only org2 data (not org1 + org2)
          expect(stats2.clients_count).toBe(org2Data.clientsCount);
          expect(stats2.projects_count).toBe(org2Data.projectsCount);
          expect(stats2.tasks_count).toBe(0);
          expect(stats2.invoices_count).toBe(0);

          // The key property: if data was leaking across organizations,
          // org1's counts would be org1Data + org2Data, not just org1Data
          // Since we've verified exact matches above, we've proven isolation

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org1.id);
          await supabase.from('organizations').delete().eq('id', org2.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
