/**
 * Property-Based Tests for Superadmin Access Control
 * Feature: superadmin-organization-management
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

describe('Superadmin Access Control Property Tests', () => {
  beforeEach(async () => {
    // Clean up test profiles before each test
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .like('first_name', 'Test Access%');

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        await supabase.auth.admin.deleteUser(profile.id);
      }
    }
  });

  /**
   * Feature: superadmin-organization-management, Property 1: Superadmin access control
   * For any user, if they are not a superadmin, they should be unable to access 
   * organization management features.
   * Validates: Requirements 1.4, 8.1, 8.2
   */
  it('Property 1: Superadmin access control', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress().map(e => `test-access-${Date.now()}-${Math.random()}@example.com`),
          firstName: fc.string({ minLength: 1, maxLength: 20 }).map(s => `Test Access ${s}`),
          isSuperadmin: fc.boolean(),
        }),
        async (userData) => {
          // Create a test auth user
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: 'test-password-123',
            email_confirm: true,
          });

          expect(authError).toBeNull();
          expect(authData.user).not.toBeNull();
          
          const userId = authData.user!.id;

          // Set the superadmin flag
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              first_name: userData.firstName,
              is_superadmin: userData.isSuperadmin,
            })
            .eq('id', userId);

          expect(updateError).toBeNull();

          // Create a client with the user's JWT token (simulates authenticated user)
          const { data: sessionData } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: userData.email,
          });

          // Create a new client with the user's session
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

          // Set the session for the user client
          await userClient.auth.setSession({
            access_token: sessionData.properties?.action_link?.split('access_token=')[1]?.split('&')[0] || '',
            refresh_token: 'dummy-refresh-token',
          });

          // Try to query organizations (this should respect RLS policies)
          const { data: organizations, error: queryError } = await userClient
            .from('organizations')
            .select('*');

          // If user is NOT a superadmin, they should get no results or an error
          // If user IS a superadmin, they should be able to query organizations
          if (!userData.isSuperadmin) {
            // Non-superadmin should either get empty results or an error
            expect(organizations === null || organizations.length === 0).toBe(true);
          } else {
            // Superadmin should be able to query (no error)
            expect(queryError).toBeNull();
          }

          // Clean up - delete the auth user (cascades to profile)
          await supabase.auth.admin.deleteUser(userId);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});
