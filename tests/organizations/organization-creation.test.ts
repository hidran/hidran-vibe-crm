
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

// Helper to create URL-friendly slugs (mirroring the logic in useOrganizations.ts)
const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-')   // Replace multiple - with single -
        .replace(/^-+/, '')       // Trim - from start
        .replace(/-+$/, '');      // Trim - from end
};

describe('Organization Creation Specs', () => {
    let superadminToken: string;
    let superadminUser: any;
    let createdOrgId: string;

    beforeEach(async () => {
        // Helper to get token
        const getToken = async (email: string, password: string) => {
            const authClient = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
            const { data, error } = await authClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data.session!.access_token;
        };

        const createSuperadmin = async () => {
            const email = `superadmin-${Date.now()}@example.com`;
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: 'password123',
                email_confirm: true,
                user_metadata: { is_superadmin: true }
            });
            if (error) throw error;

            const user = data.user;
            await supabaseAdmin.from('profiles').update({ is_superadmin: true }).eq('id', user.id);
            await supabaseAdmin.from('user_roles').insert({ user_id: user.id, role: 'superadmin' });

            const token = await getToken(email, 'password123');
            return { user, token };
        };

        const sa = await createSuperadmin();
        superadminUser = sa.user;
        superadminToken = sa.token;
    });

    afterEach(async () => {
        if (createdOrgId) {
            await supabaseAdmin.from('organizations').delete().eq('id', createdOrgId);
        }
        if (superadminUser) {
            await supabaseAdmin.auth.admin.deleteUser(superadminUser.id);
        }
    });

    it('should create an organization with all required fields', async () => {
        const orgName = "Test Organization " + Date.now();
        const expectedSlug = slugify(orgName);

        const client = createClientForUser(superadminToken);

        // We simulate the logic in useCreateOrganization hook
        const { data, error } = await client.from('organizations').insert({
            name: orgName,
            slug: expectedSlug
        }).select().single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        createdOrgId = data.id;

        // Verify all fields
        expect(data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(data.name).toBe(orgName);
        expect(data.slug).toBe(expectedSlug);
        expect(data.plan).toBe('free');
        expect(data.created_at).toBeDefined();
        expect(data.updated_at).toBeDefined();

        // Check if timestamps are valid dates
        expect(new Date(data.created_at).getTime()).toBeGreaterThan(0);
        expect(new Date(data.updated_at).getTime()).toBeGreaterThan(0);

        // Verify retrieval
        const { data: retrievedData } = await client.from('organizations').select('*').eq('id', createdOrgId).single();
        expect(retrievedData).toBeDefined();
        expect(retrievedData.name).toBe(orgName);
    });

    it('should fail to create an organization with a duplicate slug', async () => {
        const orgName = "Duplicate Org " + Date.now();
        const slug = "duplicate-slug-" + Date.now();

        await supabaseAdmin.from('organizations').insert({
            name: orgName,
            slug: slug
        });

        const client = createClientForUser(superadminToken);
        const { error } = await client.from('organizations').insert({
            name: "Another Org",
            slug: slug
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe('23505'); // Unique violation
    });

    it('should update updated_at when the organization is modified', async () => {
        const orgName = "Update Test " + Date.now();
        const slug = "update-test-" + Date.now();

        const { data: initialData } = await supabaseAdmin.from('organizations').insert({
            name: orgName,
            slug: slug
        }).select().single();

        createdOrgId = initialData.id;
        const initialUpdatedAt = initialData.updated_at;

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: updatedData } = await supabaseAdmin.from('organizations')
            .update({ name: orgName + " Updated" })
            .eq('id', createdOrgId)
            .select().single();

        expect(updatedData.updated_at).not.toBe(initialUpdatedAt);
        expect(new Date(updatedData.updated_at).getTime()).toBeGreaterThan(new Date(initialUpdatedAt).getTime());
    });

    it('should fail to create an organization without a name', async () => {
        const client = createClientForUser(superadminToken);

        // Note: Supabase RLS or DB constraints will handle this
        const { error } = await client.from('organizations').insert({
            slug: 'no-name-org'
        } as any);

        expect(error).not.toBeNull();
        // Database error for NOT NULL constraint violation
        expect(error?.code).toBe('23502');
    });

    it('should fail to create an organization without a slug', async () => {
        const client = createClientForUser(superadminToken);

        const { error } = await client.from('organizations').insert({
            name: 'No Slug Org'
        } as any);

        expect(error).not.toBeNull();
        expect(error?.code).toBe('23502');
    });
});
