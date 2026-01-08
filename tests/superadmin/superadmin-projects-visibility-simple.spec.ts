import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Superadmin Projects Visibility', () => {
    let superadminUser: any;
    let proj1Name: string;
    let proj2Name: string;

    test.beforeAll(async () => {
        // Create superadmin
        const SAemail = `sa-proj-simple-${Date.now()}@test.com`;
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

        // Create Organization 1 with Project 1
        const { data: org1 } = await supabase.from('organizations').insert({
            name: `Alpha Corp ${Date.now()}`,
            slug: `alpha-corp-${Date.now()}`
        }).select().single();

        proj1Name = `Alpha Project ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org1!.id,
            name: proj1Name,
            status: 'active'
        });

        // Create Organization 2 with Project 2
        const { data: org2 } = await supabase.from('organizations').insert({
            name: `Beta Corp ${Date.now()}`,
            slug: `beta-corp-${Date.now()}`
        }).select().single();

        proj2Name = `Beta Project ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org2!.id,
            name: proj2Name,
            status: 'planning'
        });
    });

    test('Superadmin can see projects from all organizations', async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });

        // Navigate to Projects page
        await page.goto('http://localhost:8080/projects');
        await page.waitForSelector('h1:has-text("Projects")', { timeout: 10000 });

        // Wait for the table to load
        await page.waitForSelector('table', { timeout: 10000 });

        // Verify both projects are visible using table row locators
        const table = page.locator('table');
        await expect(table.locator(`tr:has-text("${proj1Name}")`)).toBeVisible();
        await expect(table.locator(`tr:has-text("${proj2Name}")`)).toBeVisible();

        console.log('✅ Superadmin can see projects from all organizations');
    });
});
