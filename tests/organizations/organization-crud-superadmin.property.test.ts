/**
 * Property-Based Tests for Organization CRUD Operations Require Superadmin
 * Feature: superadmin-organization-management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for testing with service role key (bypasses RLS for setup)
const supabaseAdmin = createClient(
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

describe('Organization CRUD Superadmin Requirement Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .like('name', 'Test Org CRUD%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      }
    }

    // Clean up test profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .like('first_name', 'Test CRUD User%');

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
      }
    }
  });

  /**
   * Feature: superadmin-organization-management, Property 3: Organization CRUD operations require superadmin
   * For any organization CRUD operation (create, update, delete) across ALL organizations, 
   * the operation should only succeed if the user has is_superadmin set to true.
   * Note: Regular organization admins can manage their OWN organization, but only superadmins
   * can perform operations across ALL organizations (which is what this feature enables).
   * Validates: Requirements 2.5, 8.2
   */
  it('Property 3: Organization CRUD operations require superadmin', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isSuperadmin: fc.boolean(),
          orgName: fc.string({ minLength: 5, maxLength: 30 }).map(s => `Test Org CRUD ${s}`),
          updatedOrgName: fc.string({ minLength: 5, maxLength: 30 }).map(s => `Test Org CRUD Updated ${s}`),
        }),
        async ({ isSuperadmin, orgName, updatedOrgName }) => {
          // Create a test user with the specified superadmin status
          const testEmail = `test-crud-${Date.now()}-${Math.random()}@example.com`;
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: testEmail,
            password: 'test-password-123',
            email_confirm: true,
          });

          expect(authError).toBeNull();
          expect(authData.user).not.toBeNull();
          
          const userId = authData.user!.id;

          // Set the superadmin flag on the profile
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              first_name: `Test CRUD User ${Date.now()}`,
              is_superadmin: isSuperadmin,
            })
            .eq('id', userId);

          expect(updateError).toBeNull();

          // Create a user-specific Supabase client (respects RLS)
          const userClient = createClient(
            import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          );

          // Sign in as the test user
          const { error: signInError } = await userClient.auth.signInWithPassword({
            email: testEmail,
            password: 'test-password-123',
          });

          expect(signInError).toBeNull();

          // Create an organization that the test user is NOT a member of
          // This tests the superadmin-specific capability to manage ANY organization
          const { data: testOrg, error: testOrgError } = await supabaseAdmin
            .from('organizations')
            .insert({
              name: orgName,
              slug: `test-crud-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          expect(testOrgError).toBeNull();
          expect(testOrg).not.toBeNull();

          // Test UPDATE operation on an organization the user doesn't belong to
          const { data: updateData, error: updateOrgError } = await userClient
            .from('organizations')
            .update({ name: updatedOrgName })
            .eq('id', testOrg!.id)
            .select()
            .single();

          if (isSuperadmin) {
            // Superadmin should be able to update ANY organization
            expect(updateOrgError).toBeNull();
            expect(updateData).not.toBeNull();
            expect(updateData?.name).toBe(updatedOrgName);
          } else {
            // Non-superadmin should NOT be able to update an organization they don't belong to
            expect(updateOrgError).not.toBeNull();
            expect(updateData).toBeNull();
          }

          // Test DELETE operation on an organization the user doesn't belong to
          const { error: deleteError } = await userClient
            .from('organizations')
            .delete()
            .eq('id', testOrg!.id);

          if (isSuperadmin) {
            // Superadmin should be able to delete ANY organization
            expect(deleteError).toBeNull();

            // Verify deletion
            const { data: verifyData, error: verifyError } = await supabaseAdmin
              .from('organizations')
              .select('id')
              .eq('id', testOrg!.id)
              .maybeSingle();

            expect(verifyError).toBeNull();
            expect(verifyData).toBeNull();
          } else {
            // Non-superadmin should NOT be able to delete an organization they don't belong to
            expect(deleteError).not.toBeNull();

            // Verify organization still exists
            const { data: verifyData, error: verifyError } = await supabaseAdmin
              .from('organizations')
              .select('id')
              .eq('id', testOrg!.id)
              .single();

            expect(verifyError).toBeNull();
            expect(verifyData).not.toBeNull();

            // Cleanup the test org
            await supabaseAdmin.from('organizations').delete().eq('id', testOrg!.id);
          }

          // Test CREATE operation (creating new organizations)
          const { data: createData, error: createError } = await userClient
            .from('organizations')
            .insert({
              name: `${orgName} New`,
              slug: `test-crud-new-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          if (isSuperadmin) {
            // Superadmin should be able to create new organizations
            expect(createError).toBeNull();
            expect(createData).not.toBeNull();
            
            // Cleanup
            await supabaseAdmin.from('organizations').delete().eq('id', createData!.id);
          } else {
            // Non-superadmin should NOT be able to create organizations via superadmin interface
            expect(createError).not.toBeNull();
            expect(createData).toBeNull();
          }

          // Cleanup - delete the auth user (cascades to profile)
          await userClient.auth.signOut();
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
      ),
      { numRuns: 100, timeout: 15000 }
    );
  }, 30000);
});
