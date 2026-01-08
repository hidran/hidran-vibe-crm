
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for testing with service role key
const supabaseAdmin = createClient(
    import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

const createClientForUser = (token: string) => {
    return createClient(
        URL,
        ANON_KEY,
        {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        }
    );
};

describe('Client CRUD E2E Specs', () => {
    let superadminToken: string;
    let org1OwnerToken: string;
    let org2OwnerToken: string;

    let superadminUser: any;
    let org1OwnerUser: any;
    let org2OwnerUser: any;

    let org1Id: string;
    let org2Id: string;

    beforeEach(async () => {
        // Helper to get token
        const getToken = async (email: string, password: string) => {
            const authClient = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
            const { data, error } = await authClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data.session!.access_token;
        };

        const createTestUser = async (role: 'superadmin' | 'owner', orgId?: string) => {
            const email = `${role}-${Date.now()}-${Math.random()}@example.com`;
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: 'password123',
                email_confirm: true,
                user_metadata: { is_superadmin: role === 'superadmin' }
            });
            if (error) throw error;

            const user = data.user;

            // Set profile superadmin flag if needed
            if (role === 'superadmin') {
                await supabaseAdmin.from('profiles').update({ is_superadmin: true }).eq('id', user.id);
                // Also add to user_roles
                await supabaseAdmin.from('user_roles').insert({ user_id: user.id, role: 'superadmin' });
            }

            // Assign to org if provided
            if (orgId) {
                await supabaseAdmin.from('organization_members').insert({
                    organization_id: orgId,
                    user_id: user.id,
                    role: 'owner' // Assuming owner for now to have full org access
                });
            }

            const token = await getToken(email, 'password123');
            return { user, token };
        };

        // 1. Create Organizations
        const { data: org1 } = await supabaseAdmin.from('organizations').insert({
            name: `Org 1 ${Date.now()}`, slug: `org1-${Date.now()}`
        }).select().single();
        org1Id = org1.id;

        const { data: org2 } = await supabaseAdmin.from('organizations').insert({
            name: `Org 2 ${Date.now()}`, slug: `org2-${Date.now()}`
        }).select().single();
        org2Id = org2.id;

        // 2. Create Users
        const sa = await createTestUser('superadmin');
        superadminUser = sa.user;
        superadminToken = sa.token;

        const o1 = await createTestUser('owner', org1Id);
        org1OwnerUser = o1.user;
        org1OwnerToken = o1.token;

        const o2 = await createTestUser('owner', org2Id);
        org2OwnerUser = o2.user;
        org2OwnerToken = o2.token;
    });

    afterEach(async () => {
        if (org1Id) await supabaseAdmin.from('organizations').delete().eq('id', org1Id);
        if (org2Id) await supabaseAdmin.from('organizations').delete().eq('id', org2Id);

        const usersToDelete = [superadminUser, org1OwnerUser, org2OwnerUser].filter(Boolean);
        for (const u of usersToDelete) {
            await supabaseAdmin.auth.admin.deleteUser(u.id);
        }
    });

    // --- Superadmin Tests ---

    it('Superadmin can CREATE a client in ANY organization', async () => {
        const client = createClientForUser(superadminToken);
        const { data, error } = await client.from('clients').insert({
            organization_id: org1Id,
            name: 'Superadmin Client',
            status: 'active'
        }).select().single();

        expect(error).toBeNull();
        expect(data).toHaveProperty('id');
        expect(data.organization_id).toBe(org1Id);
    });

    it('Superadmin can UPDATE a client in ANY organization', async () => {
        // Setup: existing client in Org 1
        const { data: existingClient } = await supabaseAdmin.from('clients').insert({
            organization_id: org1Id,
            name: 'Original Name',
            status: 'active'
        }).select().single();

        const client = createClientForUser(superadminToken);
        const { data, error } = await client.from('clients')
            .update({ name: 'Updated by SA' })
            .eq('id', existingClient.id)
            .select().single();

        expect(error).toBeNull();
        expect(data.name).toBe('Updated by SA');
    });

    it('Superadmin can DELETE a client in ANY organization', async () => {
        const { data: existingClient } = await supabaseAdmin.from('clients').insert({
            organization_id: org1Id,
            name: 'To Delete',
            status: 'active'
        }).select().single();

        const client = createClientForUser(superadminToken);
        const { error } = await client.from('clients').delete().eq('id', existingClient.id);

        expect(error).toBeNull();

        // Verify deletion
        const { data } = await supabaseAdmin.from('clients').select().eq('id', existingClient.id).single();
        expect(data).toBeNull();
    });

    it('Superadmin can READ clients from ALL organizations', async () => {
        await supabaseAdmin.from('clients').insert([
            { organization_id: org1Id, name: 'Client Org 1', status: 'active' },
            { organization_id: org2Id, name: 'Client Org 2', status: 'active' }
        ]);

        const client = createClientForUser(superadminToken);
        const { data, error } = await client.from('clients').select('*');

        expect(error).toBeNull();
        expect(data.length).toBeGreaterThanOrEqual(2);
        const orgIds = data.map((c: any) => c.organization_id);
        expect(orgIds).toContain(org1Id);
        expect(orgIds).toContain(org2Id);
    });

    // --- Organization Owner Tests ---

    it('Org Owner can CREATE a client in THEIR organization', async () => {
        const client = createClientForUser(org1OwnerToken);
        const { data, error } = await client.from('clients').insert({
            organization_id: org1Id,
            name: 'Org 1 Client',
            status: 'active'
        }).select().single();

        expect(error).toBeNull();
        expect(data.id).toBeDefined();
    });

    it('Org Owner CANNOT create a client in ANOTHER organization', async () => {
        const client = createClientForUser(org1OwnerToken);
        const { data, error } = await client.from('clients').insert({
            organization_id: org2Id,
            name: 'Malicious Client',
            status: 'active'
        }).select().single();

        // RLS should block this
        expect(error).not.toBeNull();
    });

    it('Org Owner can READ clients ONLY from THEIR organization', async () => {
        // Seed dat
        await supabaseAdmin.from('clients').insert([
            { organization_id: org1Id, name: 'My Client', status: 'active' },
            { organization_id: org2Id, name: 'Other Client', status: 'active' }
        ]);

        const client = createClientForUser(org1OwnerToken);
        const { data, error } = await client.from('clients').select('*');

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
        expect(data[0].name).toBe('My Client');
    });

    it('Org Owner can UPDATE clients in THEIR organization', async () => {
        const { data: myClient } = await supabaseAdmin.from('clients').insert({
            organization_id: org1Id,
            name: 'My Client',
            status: 'active'
        }).select().single();

        const client = createClientForUser(org1OwnerToken);
        const { data, error } = await client.from('clients')
            .update({ name: 'Updated Name' })
            .eq('id', myClient.id)
            .select().single();

        expect(error).toBeNull();
        expect(data.name).toBe('Updated Name');
    });

    it('Org Owner CANNOT UPDATE clients in ANOTHER organization', async () => {
        const { data: otherClient } = await supabaseAdmin.from('clients').insert({
            organization_id: org2Id,
            name: 'Other Client',
            status: 'active'
        }).select().single();

        const client = createClientForUser(org1OwnerToken);

        // Try to update
        const { error, data } = await client.from('clients')
            .update({ name: 'Hacked' })
            .eq('id', otherClient.id)
            .select();

        // RLS usually returns empty array on update if no rows match policy, or error
        // Checking if data is null or empty array, or if error exists
        expect(data).toHaveLength(0); // Should verify no rows were returned/updated

        // Double check persistence
        const { data: check } = await supabaseAdmin.from('clients').select().eq('id', otherClient.id).single();
        expect(check.name).toBe('Other Client');
    });

    it('Org Owner can DELETE clients in THEIR organization', async () => {
        const { data: myClient } = await supabaseAdmin.from('clients').insert({
            organization_id: org1Id,
            name: 'To Delete',
            status: 'active'
        }).select().single();

        const client = createClientForUser(org1OwnerToken);
        const { error } = await client.from('clients').delete().eq('id', myClient.id);

        expect(error).toBeNull();
        const { data } = await supabaseAdmin.from('clients').select().eq('id', myClient.id).single();
        expect(data).toBeNull();
    });

    it('Org Owner CANNOT DELETE clients in ANOTHER organization', async () => {
        const { data: otherClient } = await supabaseAdmin.from('clients').insert({
            organization_id: org2Id,
            name: 'To Delete',
            status: 'active'
        }).select().single();

        const client = createClientForUser(org1OwnerToken);
        const { error } = await client.from('clients').delete().eq('id', otherClient.id);

        // Delete usually succeeds with 0 rows affected if RLS hides the row, 
        // or fails if RLS explicitly denies. 
        // We verify the row still exists.

        const { data: check } = await supabaseAdmin.from('clients').select().eq('id', otherClient.id).single();
        expect(check).not.toBeNull();
        expect(check.id).toBe(otherClient.id);
    });
});
