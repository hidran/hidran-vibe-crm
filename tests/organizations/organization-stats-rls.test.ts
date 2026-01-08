/**
 * RLS (Row Level Security) Tests for Organization Statistics View
 * Feature: dashboard-analytics
 * Validates: Requirements 8.1, 8.2, 8.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Organization Stats RLS Policy Tests', () => {
  let serviceRoleClient: SupabaseClient;
  let user1Client: SupabaseClient;
  let user2Client: SupabaseClient;
  let org1Id: string;
  let org2Id: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    // Service role client for setup
    serviceRoleClient = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create two test users
    const user1Email = `test-user-1-${Date.now()}@example.com`;
    const user2Email = `test-user-2-${Date.now()}@example.com`;

    const { data: user1Data, error: user1Error } = await serviceRoleClient.auth.admin.createUser({
      email: user1Email,
      password: 'testpassword123',
      email_confirm: true,
    });

    if (user1Error || !user1Data.user) {
      throw new Error(`Failed to create user 1: ${user1Error?.message}`);
    }
    user1Id = user1Data.user.id;

    const { data: user2Data, error: user2Error } = await serviceRoleClient.auth.admin.createUser({
      email: user2Email,
      password: 'testpassword123',
      email_confirm: true,
    });

    if (user2Error || !user2Data.user) {
      throw new Error(`Failed to create user 2: ${user2Error?.message}`);
    }
    user2Id = user2Data.user.id;

    // Create two organizations
    const { data: org1, error: org1Error } = await serviceRoleClient
      .from('organizations')
      .insert({
        name: `RLS Test Org 1 ${Date.now()}`,
        slug: `rls-test-org-1-${Date.now()}`,
      })
      .select()
      .single();

    if (org1Error || !org1) {
      throw new Error(`Failed to create org 1: ${org1Error?.message}`);
    }
    org1Id = org1.id;

    const { data: org2, error: org2Error } = await serviceRoleClient
      .from('organizations')
      .insert({
        name: `RLS Test Org 2 ${Date.now()}`,
        slug: `rls-test-org-2-${Date.now()}`,
      })
      .select()
      .single();

    if (org2Error || !org2) {
      throw new Error(`Failed to create org 2: ${org2Error?.message}`);
    }
    org2Id = org2.id;

    // Add user1 to org1
    await serviceRoleClient.from('organization_members').insert({
      organization_id: org1Id,
      user_id: user1Id,
      role: 'member',
    });

    // Add user2 to org2
    await serviceRoleClient.from('organization_members').insert({
      organization_id: org2Id,
      user_id: user2Id,
      role: 'member',
    });

    // Create some test data for each org
    await serviceRoleClient.from('clients').insert([
      { organization_id: org1Id, name: 'Org1 Client 1', email: 'org1-c1@test.com' },
      { organization_id: org1Id, name: 'Org1 Client 2', email: 'org1-c2@test.com' },
    ]);

    await serviceRoleClient.from('clients').insert([
      { organization_id: org2Id, name: 'Org2 Client 1', email: 'org2-c1@test.com' },
      { organization_id: org2Id, name: 'Org2 Client 2', email: 'org2-c2@test.com' },
      { organization_id: org2Id, name: 'Org2 Client 3', email: 'org2-c3@test.com' },
    ]);

    // Sign in as user1
    const { data: session1 } = await serviceRoleClient.auth.signInWithPassword({
      email: user1Email,
      password: 'testpassword123',
    });

    user1Client = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      {
        global: {
          headers: {
            Authorization: `Bearer ${session1.session?.access_token}`,
          },
        },
      }
    );

    // Sign in as user2
    const { data: session2 } = await serviceRoleClient.auth.signInWithPassword({
      email: user2Email,
      password: 'testpassword123',
    });

    user2Client = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      {
        global: {
          headers: {
            Authorization: `Bearer ${session2.session?.access_token}`,
          },
        },
      }
    );
  });

  afterAll(async () => {
    // Cleanup
    await serviceRoleClient.from('organizations').delete().eq('id', org1Id);
    await serviceRoleClient.from('organizations').delete().eq('id', org2Id);
    await serviceRoleClient.auth.admin.deleteUser(user1Id);
    await serviceRoleClient.auth.admin.deleteUser(user2Id);
  });

  it('should allow user1 to see only org1 stats', async () => {
    const { data, error } = await user1Client
      .from('organization_stats')
      .select('*')
      .eq('organization_id', org1Id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.organization_id).toBe(org1Id);
    expect(data?.clients_count).toBe(2);
  });

  it('should prevent user1 from seeing org2 stats', async () => {
    const { data, error } = await user1Client
      .from('organization_stats')
      .select('*')
      .eq('organization_id', org2Id);

    // User1 should not see org2's stats
    expect(data).toEqual([]);
  });

  it('should allow user2 to see only org2 stats', async () => {
    const { data, error } = await user2Client
      .from('organization_stats')
      .select('*')
      .eq('organization_id', org2Id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.organization_id).toBe(org2Id);
    expect(data?.clients_count).toBe(3);
  });

  it('should prevent user2 from seeing org1 stats', async () => {
    const { data, error } = await user2Client
      .from('organization_stats')
      .select('*')
      .eq('organization_id', org1Id);

    // User2 should not see org1's stats
    expect(data).toEqual([]);
  });

  it('should only return organizations the user has access to when querying all stats', async () => {
    const { data: user1Data } = await user1Client
      .from('organization_stats')
      .select('*');

    const { data: user2Data } = await user2Client
      .from('organization_stats')
      .select('*');

    // User1 should only see org1
    expect(user1Data?.length).toBe(1);
    expect(user1Data?.[0].organization_id).toBe(org1Id);

    // User2 should only see org2
    expect(user2Data?.length).toBe(1);
    expect(user2Data?.[0].organization_id).toBe(org2Id);
  });
});
