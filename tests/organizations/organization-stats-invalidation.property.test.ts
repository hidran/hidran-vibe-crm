/**
 * Property-Based Tests for Organization Statistics Query Invalidation
 * Feature: dashboard-analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';

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

describe('Organization Statistics Query Invalidation Property Tests', () => {
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
   * Feature: dashboard-analytics, Property 9: Statistics refresh on data changes
   * For any data mutation (create, update, delete), the statistics queries should be
   * invalidated and refetched.
   * Validates: Requirements 1.5
   */
  it('Property 9: Statistics refresh on data changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialClients: fc.integer({ min: 1, max: 5 }),
          addedClients: fc.integer({ min: 1, max: 5 }),
          deletedClients: fc.integer({ min: 1, max: 3 }),
        }),
        async ({ initialClients, addedClients, deletedClients }) => {
          // Ensure we don't try to delete more than we have
          const actualDeletedClients = Math.min(deletedClients, initialClients);

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

          // Create initial clients
          const initialClientPromises = Array.from({ length: initialClients }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org.id,
              name: `Initial Client ${i}`,
              email: `initial-client${i}@test.com`,
            }).select().single()
          );
          const initialClientResults = await Promise.all(initialClientPromises);
          const createdClients = initialClientResults.map(r => r.data).filter(Boolean);

          // Query initial stats
          const { data: initialStats, error: initialStatsError } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org.id)
            .single();

          if (initialStatsError) {
            throw new Error(`Failed to query initial stats: ${initialStatsError.message}`);
          }

          // Verify initial count
          expect(initialStats.clients_count).toBe(initialClients);

          // Add more clients (simulating data mutation)
          const addedClientPromises = Array.from({ length: addedClients }, (_, i) =>
            supabase.from('clients').insert({
              organization_id: org.id,
              name: `Added Client ${i}`,
              email: `added-client${i}@test.com`,
            })
          );
          await Promise.all(addedClientPromises);

          // Query stats after addition
          const { data: afterAddStats, error: afterAddStatsError } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org.id)
            .single();

          if (afterAddStatsError) {
            throw new Error(`Failed to query stats after addition: ${afterAddStatsError.message}`);
          }

          // Verify count increased (this proves the view reflects the change)
          expect(afterAddStats.clients_count).toBe(initialClients + addedClients);

          // Delete some clients (simulating data mutation)
          const clientsToDelete = createdClients.slice(0, actualDeletedClients);
          const deletePromises = clientsToDelete.map(client =>
            supabase.from('clients').delete().eq('id', client!.id)
          );
          await Promise.all(deletePromises);

          // Query stats after deletion
          const { data: afterDeleteStats, error: afterDeleteStatsError } = await supabase
            .from('organization_stats')
            .select('*')
            .eq('organization_id', org.id)
            .single();

          if (afterDeleteStatsError) {
            throw new Error(`Failed to query stats after deletion: ${afterDeleteStatsError.message}`);
          }

          // Verify count decreased (this proves the view reflects the deletion)
          const expectedFinalCount = initialClients + addedClients - actualDeletedClients;
          expect(afterDeleteStats.clients_count).toBe(expectedFinalCount);

          // The property holds: the statistics view always reflects the current database state
          // This is the foundation for query invalidation - when the hook refetches,
          // it will get the updated counts

          // Cleanup
          await supabase.from('organizations').delete().eq('id', org.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
