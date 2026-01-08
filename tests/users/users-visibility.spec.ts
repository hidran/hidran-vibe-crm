
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Users Management Visibility', () => {
    let superadminUser: any;
    let regularUserA: any;
    let regularUserB: any;
    let orgAId: string;
    let orgBId: string;

    test.beforeAll(async () => {
        // 1. Create Org A
        const { data: orgA, error: errA } = await supabase.from('organizations').insert({
            name: `Org A ${Date.now()}`,
            slug: `org-a-${Date.now()}`
        }).select().single();
        if (errA) throw errA;
        orgAId = orgA.id;

        // 2. Create Org B
        const { data: orgB, error: errB } = await supabase.from('organizations').insert({
            name: `Org B ${Date.now()}`,
            slug: `org-b-${Date.now()}`
        }).select().single();
        if (errB) throw errB;
        orgBId = orgB.id;

        // 3. Create Superadmin
        const saEmail = `superadmin-users-${Date.now()}@test.com`;
        const { data: sa, error: saErr } = await supabase.auth.admin.createUser({
            email: saEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: { is_superadmin: true }
        });
        if (saErr) throw saErr;
        superadminUser = sa.user;
        await supabase.from('profiles').update({ is_superadmin: true }).eq('id', superadminUser.id);

        // 4. Create Regular User A (Member of Org A)
        const regAEmail = `user-a-${Date.now()}@test.com`;
        const { data: regA, error: regAErr } = await supabase.auth.admin.createUser({
            email: regAEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: { first_name: 'User', last_name: 'A' }
        });
        if (regAErr) throw regAErr;
        regularUserA = regA.user;

        // Explicitly update profile to ensure names are there
        await supabase.from('profiles').update({
            first_name: 'User',
            last_name: 'A'
        }).eq('id', regularUserA.id);

        await supabase.from('organization_members').insert({
            organization_id: orgAId,
            user_id: regularUserA.id,
            role: 'member'
        });

        // 5. Create Regular User B (Member of Org B)
        const regBEmail = `user-b-${Date.now()}@test.com`;
        const { data: regB, error: regBErr } = await supabase.auth.admin.createUser({
            email: regBEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: { first_name: 'User', last_name: 'B' }
        });
        if (regBErr) throw regBErr;
        regularUserB = regB.user;

        // Explicitly update profile to ensure names are there
        await supabase.from('profiles').update({
            first_name: 'User',
            last_name: 'B'
        }).eq('id', regularUserB.id);

        await supabase.from('organization_members').insert({
            organization_id: orgBId,
            user_id: regularUserB.id,
            role: 'member'
        });
    });

    const login = async (page: any, email: string) => {
        await page.goto('http://localhost:8081/auth');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:8081/dashboard', { timeout: 15000 });
    };

    test('Regular user sees only members of their organization', async ({ page }) => {
        await login(page, regularUserA.email);
        await page.goto('http://localhost:8081/users');

        // Should see User A
        await expect(page.getByText('User A')).toBeVisible();
        // Should NOT see User B
        await expect(page.getByText('User B')).not.toBeVisible();
    });

    test('Superadmin sees all users across organizations', async ({ page }) => {
        await login(page, superadminUser.email);
        await page.goto('http://localhost:8081/users');

        // Should see User A
        await expect(page.getByText('User A')).toBeVisible();
        // Should see User B
        await expect(page.getByText('User B')).toBeVisible();
    });
});
