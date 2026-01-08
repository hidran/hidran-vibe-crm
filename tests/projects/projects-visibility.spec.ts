
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Projects Visibility E2E', () => {
    let superadminUser: any;
    let org1Id: string;
    let org2Id: string;
    let project1Name: string;
    let project2Name: string;

    test.beforeAll(async () => {
        // 1. Create Superadmin
        const SAemail = `superadmin-projects-${Date.now()}@test.com`;
        const { data: user, error: userError } = await supabase.auth.admin.createUser({
            email: SAemail,
            password: 'password123',
            email_confirm: true,
            user_metadata: { is_superadmin: true }
        });
        if (userError) throw userError;
        superadminUser = user.user;
        await supabase.from('profiles').update({ is_superadmin: true }).eq('id', superadminUser.id);
        await supabase.from('user_roles').insert({ user_id: superadminUser.id, role: 'superadmin' });

        // 2. Create Org 1 + Project 1
        const { data: org1 } = await supabase.from('organizations').insert({
            name: `Org 1 ${Date.now()}`,
            slug: `org1-proj-${Date.now()}`
        }).select().single();
        org1Id = org1!.id;

        project1Name = `Project 1 ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org1Id,
            name: project1Name,
            status: 'active',
            priority: 'medium'
        });

        // 3. Create Org 2 + Project 2
        const { data: org2 } = await supabase.from('organizations').insert({
            name: `Org 2 ${Date.now()}`,
            slug: `org2-proj-${Date.now()}`
        }).select().single();
        org2Id = org2!.id;

        project2Name = `Project 2 ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org2Id,
            name: project2Name,
            status: 'active',
            priority: 'medium'
        });
    });

    const login = async (page: any) => {
        await page.goto('http://localhost:8081/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:8081/dashboard', { timeout: 15000 });
    };

    test('Superadmin can see projects from ALL organizations', async ({ page }) => {
        await login(page);

        // Go to Projects page
        await page.goto('http://localhost:8081/projects');

        // Wait for table to load
        await page.waitForSelector('table', { timeout: 10000 });

        // Verify both project names are present
        const proj1 = page.locator(`text=${project1Name}`);
        const proj2 = page.locator(`text=${project2Name}`);

        await expect(proj1).toBeVisible({ timeout: 10000 });
        await expect(proj2).toBeVisible({ timeout: 10000 });
    });
});
