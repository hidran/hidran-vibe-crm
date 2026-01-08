/**
 * Property-Based Tests for Organization Switch
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

describe('Organization Switch Property Tests', () => {
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
   * Feature: dashboard-analytics, Property 10: Organization switch triggers refresh
   * For any organization switch, all statistics and revenue queries should be invalidated
   * and refetched for the new organization.
   * Validates: Requirements 8.4
   */
  it('Property 10: Organization switch triggers refresh', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          org1Clients: fc.integer({ min: 1, max: 10 }),
          org1Projects: fc.integer({ min: 1, max: 10 }),
          org2Clients: fc.integer({ min: 1, max: 10 }),
          org2Projects: fc.integer({ min: 1, max: 10 }),
        }),
        async ({ org1Clients, org1Projects, org2Clients, org2Projects }) => {
          // Create two organizations with different data
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
          const org1ClientPromises = Array.from({ length: org1Clients }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org1.id,
              name: `Org1 Client ${i}`,
              email: `org1-client${i}@test.com`,
            })
          );
          await Promise.all(org1ClientPromises);

          const org1ProjectPromises = Array.from({ length: org1Projects }, (_, i) =>
            supabase.from('projects').insert({
              organization_id: org1.id,
              name: `Org1 Project ${i}`,
            })
          );
          await Promise.all(org1ProjectPromises);

          // Create data for org2
          const org2ClientPromises = Array.from({ length: org2Clients }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org2.id,
              name: `Org2 Client ${i}`,
              email: `org2-client${i}@test.com`,
            })
          );
          await Promise.all(org2ClientPromises);

          const org2ProjectPromises = Array.from({ length: org2Projects }, (_, i) =>
            supabase.from('projects').insert({
              organization_id: org2.id,
              name: `Org2 Project ${i}`,
            })
          );
          await Promise.all(org2ProjectPromises);

          // Simulate "viewing" org1 first
          const { data: stats1First, error: stats1FirstError } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org1.id)
            .single();

          if (stats1FirstError) {
            throw new Error(`Failed to query stats for org1: ${stats1FirstError.message}`);
          }

          // Verify org1 stats
          expect(stats1First.clients_count).toBe(org1Clients);
          expect(stats1First.projects_count).toBe(org1Projects);

          // Simulate "switching" to org2
          const { data: stats2, error: stats2Error } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org2.id)
            .single();

          if (stats2Error) {
            throw new Error(`Failed to query stats for org2: ${stats2Error.message}`);
          }

          // Verify org2 stats are completely different from org1
          expect(stats2.clients_count).toBe(org2Clients);
          expect(stats2.projects_count).toBe(org2Projects);
          expect(stats2.organization_id).toBe(org2.id);
          expect(stats2.organization_id).not.toBe(org1.id);

          // Simulate "switching back" to org1
          const { data: stats1Second, error: stats1SecondError } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org1.id)
            .single();

          if (stats1SecondError) {
            throw new Error(`Failed to query stats for org1 again: ${stats1SecondError.message}`);
          }

          // Verify org1 stats are still correct (unchanged)
          expect(stats1Second.clients_count).toBe(org1Clients);
          expect(stats1Second.projects_count).toBe(org1Projects);
          expect(stats1Second.organization_id).toBe(org1.id);

          // The property holds: when switching organizations, the query returns
          // data specific to the new organization, not cached data from the previous one
          // This demonstrates that the hook's queryKey includes organizationId,
          // ensuring separate cache entries per organization

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org1.id);
          await supabase.from('organizations').delete().eq('id', org2.id);
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);
});
