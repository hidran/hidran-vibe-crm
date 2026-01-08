/**
 * Property-Based Tests for Superadmin Flag Persistence
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

describe('Superadmin Flag Persistence Property Tests', () => {
  beforeEach(async () => {
    // Clean up test profiles before each test
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .like('first_name', 'Test User%');

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        await supabase.from('profiles').delete().eq('id', profile.id);
      }
    }
  });

  /**
   * Feature: superadmin-organization-management, Property 6: Superadmin flag persistence
   * For any user designated as superadmin, the is_superadmin flag should remain true 
   * until explicitly revoked.
   * Validates: Requirements 1.2, 1.3
   */
  it('Property 6: Superadmin flag persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress().map(e => `test-${Date.now()}-${Math.random()}@example.com`),
          firstName: fc.string({ minLength: 1, maxLength: 20 }).map(s => `Test User ${s}`),
          lastName: fc.string({ minLength: 1, maxLength: 20 }),
          isSuperadmin: fc.boolean(),
        }),
        async (userData) => {
          // Create a test auth user first (required for foreign key constraint)
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: 'test-password-123',
            email_confirm: true,
          });

          expect(authError).toBeNull();
          expect(authData.user).not.toBeNull();
          
          const userId = authData.user!.id;

          // Update the profile with the specified superadmin flag
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              first_name: userData.firstName,
              last_name: userData.lastName,
              is_superadmin: userData.isSuperadmin,
            })
            .eq('id', userId);

          expect(updateError).toBeNull();

          // Query the profile to verify the flag was persisted
          const { data: profile, error: selectError } = await supabase
            .from('profiles')
            .select('is_superadmin')
            .eq('id', userId)
            .single();

          expect(selectError).toBeNull();
          expect(profile).not.toBeNull();
          
          // The persisted flag should match what we set
          expect(profile?.is_superadmin).toBe(userData.isSuperadmin);

          // Query again to ensure the flag persists across multiple reads
          const { data: profile2, error: selectError2 } = await supabase
            .from('profiles')
            .select('is_superadmin')
            .eq('id', userId)
            .single();

          expect(selectError2).toBeNull();
          expect(profile2?.is_superadmin).toBe(userData.isSuperadmin);

          // Clean up - delete the auth user (cascades to profile)
          await supabase.auth.admin.deleteUser(userId);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});
