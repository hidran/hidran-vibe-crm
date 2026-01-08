/**
 * Property-Based Tests for Organization Deletion Cascades
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

describe('Organization Deletion Cascades Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .like('name', 'Test Org Cascade%');

    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      }
    }

    // Clean up test profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .like('first_name', 'Test Cascade User%');

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
      }
    }
  });

  /**
   * Feature: superadmin-organization-management, Property 4: Organization deletion cascades
   * For any organization deletion, all related data (clients, projects, tasks, invoices) 
   * should be removed from the database.
   * Validates: Requirements 6.3, 11.1, 11.3
   */
  it('Property 4: Organization deletion cascades', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orgName: fc.string({ minLength: 5, maxLength: 30 }).map(s => `Test Org Cascade ${s}`),
          clientName: fc.string({ minLength: 3, maxLength: 20 }).map(s => `Test Client ${s}`),
          projectName: fc.string({ minLength: 3, maxLength: 20 }).map(s => `Test Project ${s}`),
          taskTitle: fc.string({ minLength: 3, maxLength: 20 }).map(s => `Test Task ${s}`),
          invoiceNumber: fc.string({ minLength: 3, maxLength: 10 }).map(s => `INV-${s}`),
        }),
        async ({ orgName, clientName, projectName, taskTitle, invoiceNumber }) => {
          // Create a superadmin user
          const testEmail = `test-cascade-${Date.now()}-${Math.random()}@example.com`;
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
              first_name: `Test Cascade User ${Date.now()}`,
              is_superadmin: true,
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

          // Create an organization
          const { data: org, error: orgError } = await userClient
            .from('organizations')
            .insert({
              name: orgName,
              slug: `test-cascade-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();

          expect(orgError).toBeNull();
          expect(org).not.toBeNull();

          const orgId = org!.id;

          // Create related data: client, project, task, invoice
          const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .insert({
              organization_id: orgId,
              name: clientName,
              status: 'active',
            })
            .select()
            .single();

          expect(clientError).toBeNull();
          expect(client).not.toBeNull();

          const { data: project, error: projectError } = await supabaseAdmin
            .from('projects')
            .insert({
              organization_id: orgId,
              client_id: client!.id,
              name: projectName,
              status: 'active',
            })
            .select()
            .single();

          expect(projectError).toBeNull();
          expect(project).not.toBeNull();

          const { data: task, error: taskError } = await supabaseAdmin
            .from('tasks')
            .insert({
              organization_id: orgId,
              project_id: project!.id,
              title: taskTitle,
              status: 'todo',
            })
            .select()
            .single();

          expect(taskError).toBeNull();
          expect(task).not.toBeNull();

          const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .insert({
              organization_id: orgId,
              client_id: client!.id,
              invoice_number: invoiceNumber,
              total_amount: 1000,
              status: 'pending',
              issue_date: new Date().toISOString().split('T')[0],
              due_date: new Date().toISOString().split('T')[0],
            })
            .select()
            .single();

          expect(invoiceError).toBeNull();
          expect(invoice).not.toBeNull();

          // Delete the organization
          const { error: deleteError } = await userClient
            .from('organizations')
            .delete()
            .eq('id', orgId);

          expect(deleteError).toBeNull();

          // Verify organization is deleted
          const { data: orgCheck, error: orgCheckError } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('id', orgId)
            .maybeSingle();

          expect(orgCheckError).toBeNull();
          expect(orgCheck).toBeNull();

          // Verify all related data is deleted (cascade)
          const { data: clientCheck, error: clientCheckError } = await supabaseAdmin
            .from('clients')
            .select('id')
            .eq('id', client!.id)
            .maybeSingle();

          expect(clientCheckError).toBeNull();
          expect(clientCheck).toBeNull();

          const { data: projectCheck, error: projectCheckError } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('id', project!.id)
            .maybeSingle();

          expect(projectCheckError).toBeNull();
          expect(projectCheck).toBeNull();

          const { data: taskCheck, error: taskCheckError } = await supabaseAdmin
            .from('tasks')
            .select('id')
            .eq('id', task!.id)
            .maybeSingle();

          expect(taskCheckError).toBeNull();
          expect(taskCheck).toBeNull();

          const { data: invoiceCheck, error: invoiceCheckError } = await supabaseAdmin
            .from('invoices')
            .select('id')
            .eq('id', invoice!.id)
            .maybeSingle();

          expect(invoiceCheckError).toBeNull();
          expect(invoiceCheck).toBeNull();

          // Cleanup - delete the auth user (cascades to profile)
          await userClient.auth.signOut();
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
      ),
      { numRuns: 20, timeout: 15000 }
    );
  }, 30000);
});
