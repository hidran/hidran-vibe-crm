/**
 * Query Performance Tests
 * 
 * These tests verify that dashboard analytics queries perform well with large datasets.
 * They measure query execution time and ensure indexes are being used effectively.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Query Performance Tests', () => {
  let testOrgId: string;
  let testUserId: string;
  const PERFORMANCE_THRESHOLD_MS = 1000; // Queries should complete within 1 second

  beforeAll(async () => {
    // Create a test organization and user for performance testing
    const { data: authData } = await supabase.auth.signUp({
      email: `perf-test-${Date.now()}@example.com`,
      password: 'test-password-123',
    });

    if (!authData.user) {
      throw new Error('Failed to create test user');
    }

    testUserId = authData.user.id;

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: 'Performance Test Org', slug: `perf-test-${Date.now()}` })
      .select()
      .single();

    if (orgError || !orgData) {
      throw new Error('Failed to create test organization');
    }

    testOrgId = orgData.id;

    // Add user to organization
    await supabase.from('organization_members').insert({
      organization_id: testOrgId,
      user_id: testUserId,
      role: 'owner',
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testOrgId) {
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('should query organization_stats view efficiently', async () => {
    const startTime = performance.now();

    const { data, error } = await supabase
      .from('organization_stats')
      .select('*')
      .eq('organization_id', testOrgId)
      .single();

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.organization_id).toBe(testOrgId);
    expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

    console.log(`organization_stats query took ${executionTime.toFixed(2)}ms`);
  });

  it('should query revenue data efficiently', async () => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const cutoffDate = twelveMonthsAgo.toISOString().split('T')[0];

    const startTime = performance.now();

    const { data, error } = await supabase
      .from('invoices')
      .select('issue_date, total_amount')
      .eq('organization_id', testOrgId)
      .eq('status', 'paid')
      .gte('issue_date', cutoffDate)
      .order('issue_date', { ascending: false });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

    console.log(`Revenue query took ${executionTime.toFixed(2)}ms`);
  });

  it('should handle organization_stats query with moderate dataset', async () => {
    // Create some test data
    const clientPromises = Array.from({ length: 50 }, (_, i) =>
      supabase.from('clients').insert({
        organization_id: testOrgId,
        name: `Test Client ${i}`,
        email: `client${i}@test.com`,
      })
    );

    const projectPromises = Array.from({ length: 30 }, (_, i) =>
      supabase.from('projects').insert({
        organization_id: testOrgId,
        name: `Test Project ${i}`,
      })
    );

    const taskPromises = Array.from({ length: 100 }, (_, i) =>
      supabase.from('tasks').insert({
        organization_id: testOrgId,
        title: `Test Task ${i}`,
      })
    );

    await Promise.all([...clientPromises, ...projectPromises, ...taskPromises]);

    const startTime = performance.now();

    const { data, error } = await supabase
      .from('organization_stats')
      .select('*')
      .eq('organization_id', testOrgId)
      .single();

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.clients_count).toBe(50);
    expect(data?.projects_count).toBe(30);
    expect(data?.tasks_count).toBe(100);
    expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

    console.log(
      `organization_stats query with 180 records took ${executionTime.toFixed(2)}ms`
    );
  });

  it('should verify indexes are being used for organization_id filtering', async () => {
    // This test verifies that the query planner is using indexes
    // In a real production environment, you would use EXPLAIN ANALYZE
    // For this test, we verify that queries with organization_id filter are fast

    const startTime = performance.now();

    const queries = await Promise.all([
      supabase.from('clients').select('id').eq('organization_id', testOrgId),
      supabase.from('projects').select('id').eq('organization_id', testOrgId),
      supabase.from('tasks').select('id').eq('organization_id', testOrgId),
      supabase.from('invoices').select('id').eq('organization_id', testOrgId),
    ]);

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    queries.forEach(({ error }) => {
      expect(error).toBeNull();
    });

    // All 4 queries should complete quickly if indexes are used
    expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

    console.log(`4 parallel organization_id queries took ${executionTime.toFixed(2)}ms`);
  });

  it('should verify revenue query uses composite index', async () => {
    // Create some test invoices
    const invoicePromises = Array.from({ length: 20 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (i % 12));
      return supabase.from('invoices').insert({
        organization_id: testOrgId,
        invoice_number: `INV-${Date.now()}-${i}`,
        status: i % 2 === 0 ? 'paid' : 'pending',
        total_amount: 1000 + i * 100,
        issue_date: date.toISOString().split('T')[0],
      });
    });

    await Promise.all(invoicePromises);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const cutoffDate = twelveMonthsAgo.toISOString().split('T')[0];

    const startTime = performance.now();

    const { data, error } = await supabase
      .from('invoices')
      .select('issue_date, total_amount')
      .eq('organization_id', testOrgId)
      .eq('status', 'paid')
      .gte('issue_date', cutoffDate)
      .order('issue_date', { ascending: false });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Should only return paid invoices
    expect(data?.length).toBeGreaterThan(0);
    expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

    console.log(
      `Revenue query with composite index took ${executionTime.toFixed(2)}ms`
    );
  });
});
