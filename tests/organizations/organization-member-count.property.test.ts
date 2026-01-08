/**
 * Property-Based Tests for Organization Member Count Accuracy
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

describe('Organization Member Count Accuracy Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .like('name', 'Test Org Member Count%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      }
    }

    // Clean up test profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .like('first_name', 'Test Member Count User%');

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
      }
    }
  });

  /**
   * Feature: superadmin-organization-management, Property 5: Member count accuracy
   * For any organization, the displayed member count should equal the actual number of 
   * records in organization_members for that organization.
   * Validates: Requirements 7.1, 7.2
   */
  it('Property 5: Member count accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orgName: fc.string({ minLength: 5, maxLength: 30 }).map(s => `Test Org Member Count ${s.trim()}`),
          memberCount: fc.integer({ min: 0, max: 5 }), // Generate 0-5 members
        }),
        async ({ orgName, memberCount }) => {
          // Create a superadmin user for testing
          const testEmail = `test-member-count-${Date.now()}-${Math.random()}@example.com`;
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: testEmail,
            password: 'test-password-123',
            email_confirm: true,
          });

          expect(authError).toBeNull();
          expect(authData.user).not.toBeNull();
          
          const userId = authData.user!.id;

          // Set the superadmin flag
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              first_name: `Test Member Count User ${Date.now()}`,
              is_superadmin: true,
            })
            .eq('id', userId);

          expect(updateError).toBeNull();

          // Create user-specific client
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

          // Create an organization
          const { data: org, error: orgError } = await userClient
            .from('organizations')
            .insert({
              name: orgName,
              slug: `test-member-count-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          expect(orgError).toBeNull();
          expect(org).not.toBeNull();

          // Create the specified number of member users and add them to the organization
          const memberUserIds: string[] = [];
          
          for (let i = 0; i < memberCount; i++) {
            const memberEmail = `test-member-${Date.now()}-${i}-${Math.random()}@example.com`;
            const { data: memberAuthData, error: memberAuthError } = await supabaseAdmin.auth.admin.createUser({
              email: memberEmail,
              password: 'test-password-123',
              email_confirm: true,
            });

            expect(memberAuthError).toBeNull();
            expect(memberAuthData.user).not.toBeNull();

            const memberUserId = memberAuthData.user!.id;
            memberUserIds.push(memberUserId);

            // Update profile with test name
            await supabaseAdmin
              .from('profiles')
              .update({
                first_name: `Test Member ${i}`,
              })
              .eq('id', memberUserId);

            // Add member to organization
            const { error: memberError } = await supabaseAdmin
              .from('organization_members')
              .insert({
                organization_id: org!.id,
                user_id: memberUserId,
                role: 'member',
              });

            expect(memberError).toBeNull();
          }

          // Now query the organization with member count using the same query pattern as useOrganizations
          const { data: orgWithStats, error: queryError } = await userClient
            .from('organizations')
            .select(`
              *,
              organization_members(count)
            `)
            .eq('id', org!.id)
            .single();

          expect(queryError).toBeNull();
          expect(orgWithStats).not.toBeNull();

          // Transform the data to extract member_count (same as useOrganizations hook)
          const displayedMemberCount = (orgWithStats as any).organization_members?.[0]?.count || 0;

          // Verify the displayed member count matches the actual count
          expect(displayedMemberCount).toBe(memberCount);

          // Double-check by querying organization_members directly
          const { data: actualMembers, error: membersError } = await supabaseAdmin
            .from('organization_members')
            .select('id')
            .eq('organization_id', org!.id);

          expect(membersError).toBeNull();
          expect(actualMembers).not.toBeNull();
          expect(actualMembers!.length).toBe(memberCount);

          // Verify the displayed count matches the actual database count
          expect(displayedMemberCount).toBe(actualMembers!.length);

          // Cleanup
          await userClient.auth.signOut();
          
          // Delete organization (cascades to organization_members)
          await supabaseAdmin.from('organizations').delete().eq('id', org!.id);
          
          // Delete all member users
          for (const memberUserId of memberUserIds) {
            await supabaseAdmin.auth.admin.deleteUser(memberUserId);
          }
          
          // Delete the superadmin test user
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
      ),
      { numRuns: 20, timeout: 20000 }
    );
  }, 60000);
});
