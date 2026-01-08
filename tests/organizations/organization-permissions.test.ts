
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for testing with service role key (bypasses RLS for setup)
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

// Anon key for auth operations
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

// Create a client for a specific user
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

describe('Organization Permissions (CRUD)', () => {
    let superadminUser: any;
    let superadminToken: string;
    let regularUser: any;
    let regularUserToken: string;
    let organizationId: string;

    beforeEach(async () => {
        // Helper to get token
        const getToken = async (email: string, password: string) => {
            const authClient = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
            const { data, error } = await authClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data.session!.access_token;
        };

        // 1. Create Superadmin User
        const superadminEmail = `superadmin-${Date.now()}-${Math.random()}@example.com`;
        const { data: saData, error: saError } = await supabaseAdmin.auth.admin.createUser({
            email: superadminEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: { is_superadmin: true }
        });
        if (saError) throw saError;
        superadminUser = saData.user;

        // Ensure is_superadmin is set in profiles table
        await supabaseAdmin.from('profiles').update({ is_superadmin: true }).eq('id', superadminUser.id);

        // Get token for superadmin
        superadminToken = await getToken(superadminEmail, 'password123');

        // 2. Create Regular User (Organization Owner)
        const regularEmail = `owner-${Date.now()}-${Math.random()}@example.com`;
        const { data: ruData, error: ruError } = await supabaseAdmin.auth.admin.createUser({
            email: regularEmail,
            password: 'password123',
            email_confirm: true,
        });
        if (ruError) throw ruError;
        regularUser = ruData.user;

        // Get token for regular user
        regularUserToken = await getToken(regularEmail, 'password123');

        // 3. Create an Organization and assign Regular User as Owner
        // We use supabaseAdmin so this should bypass RLS
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: `Test Org ${Date.now()}`,
                slug: `test-org-${Date.now()}-${Math.random()}`,
            })
            .select()
            .single();
        if (orgError) throw orgError;
        organizationId = org.id;

        const { error: memberError } = await supabaseAdmin
            .from('organization_members')
            .insert({
                organization_id: organizationId,
                user_id: regularUser.id,
                role: 'owner',
            });
        if (memberError) throw memberError;
    });

    afterEach(async () => {
        // Cleanup
        if (superadminUser) await supabaseAdmin.auth.admin.deleteUser(superadminUser.id);
        if (regularUser) await supabaseAdmin.auth.admin.deleteUser(regularUser.id);
        if (organizationId) await supabaseAdmin.from('organizations').delete().eq('id', organizationId);
    });

    it('Superadmin should be able to CREATE an organization', async () => {
        const client = createClientForUser(superadminToken);
        const slug = `sa-created-${Date.now()}`;
        const { data, error } = await client
            .from('organizations')
            .insert({
                name: 'Superadmin Created Org',
                slug: slug,
            })
            .select()
            .single();

        expect(error).toBeNull();
        expect(data).toHaveProperty('id');
        expect(data.slug).toBe(slug);

        // Cleanup extra org
        await supabaseAdmin.from('organizations').delete().eq('id', data.id);
    });

    it('Superadmin should be able to UPDATE any organization', async () => {
        const client = createClientForUser(superadminToken);
        const newName = 'Updated by Superadmin';

        const { data, error } = await client
            .from('organizations')
            .update({ name: newName })
            .eq('id', organizationId)
            .select()
            .single();

        expect(error).toBeNull();
        expect(data.name).toBe(newName);
    });

    it('Superadmin should be able to DELETE any organization', async () => {
        const client = createClientForUser(superadminToken);

        const { data: tempOrg } = await supabaseAdmin.from('organizations').insert({
            name: 'To Delete',
            slug: `del-${Date.now()}-${Math.random()}`
        }).select().single();

        const { error } = await client
            .from('organizations')
            .delete()
            .eq('id', tempOrg.id);

        expect(error).toBeNull();

        const { data: check } = await supabaseAdmin.from('organizations').select().eq('id', tempOrg.id).single();
        expect(check).toBeNull();
    });


    it('Organization Owner should NOT be able to CREATE an organization', async () => {
        const client = createClientForUser(regularUserToken);
        const slug = `owner-created-${Date.now()}`;

        const { data, error } = await client
            .from('organizations')
            .insert({
                name: 'Owner Created Org',
                slug: slug,
            })
            .select()
            .single();

        // Expecting failure (RLS policy violation)
        expect(error).not.toBeNull();
    });

    it('Organization Owner should be able to UPDATE their own organization', async () => {
        const client = createClientForUser(regularUserToken);
        const newName = 'Updated by Owner';

        // We use select() to verify the update happened and row was returned.
        const { data, error } = await client
            .from('organizations')
            .update({ name: newName })
            .eq('id', organizationId)
            .select()
            .single();

        // If RLS policies missing for update/view, this will fail/return error
        expect(error).toBeNull();
        expect(data.name).toBe(newName);
    });

    it('Organization Owner should NOT be able to DELETE their own organization', async () => {
        const client = createClientForUser(regularUserToken);

        const { error } = await client
            .from('organizations')
            .delete()
            .eq('id', organizationId);

        // RLS often silently ignores delete if rows not found/allowed.
        // We verifying persistence.

        // Verify it still exists using Admin client
        const { data, error: fetchError } = await supabaseAdmin
            .from('organizations')
            .select()
            .eq('id', organizationId)
            .single();

        expect(fetchError).toBeNull();
        expect(data).not.toBeNull();
        expect(data.id).toBe(organizationId);
    });
});
