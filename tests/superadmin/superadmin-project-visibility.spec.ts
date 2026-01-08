import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Superadmin Visual Test - All Projects Visibility', () => {
    let superadminUser: any;
    let proj1Name: string;
    let proj2Name: string;

    test.beforeAll(async () => {
        // 1. Create a superadmin
        const SAemail = `sa-visual-${Date.now()}@test.com`;
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

        // 2. Create two projects in different organizations
        const { data: org1 } = await supabase.from('organizations').insert({
            name: `Org A ${Date.now()}`,
            slug: `orga-${Date.now()}`
        }).select().single();

        proj1Name = `Project Alpha ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org1!.id,
            name: proj1Name,
        });

        const { data: org2 } = await supabase.from('organizations').insert({
            name: `Org B ${Date.now()}`,
            slug: `orgb-${Date.now()}`
        }).select().single();

        proj2Name = `Project Beta ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org2!.id,
            name: proj2Name,
        });
    });

    test('Superadmin sees all projects from all organizations in the Task Form', async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');

        // Go directly to New Task route
        await page.goto('http://localhost:8080/tasks/new');

        // Open project selector
        await page.click('button:has-text("Select project")');

        // Verify BOTH projects are visible in the dropdown
        // Using a more generic selector for the options just in case role=option isn't exactly right
        const option1 = page.locator(`[role="option"]:has-text("${proj1Name}"), [role="menuitem"]:has-text("${proj1Name}"), div:has-text("${proj1Name}")`).last();
        const option2 = page.locator(`[role="option"]:has-text("${proj2Name}"), [role="menuitem"]:has-text("${proj2Name}"), div:has-text("${proj2Name}")`).last();

        await expect(option1).toBeVisible();
        await expect(option2).toBeVisible();

        console.log('✅ Visual Test Passed: Superadmin can see projects across organizations');
    });
});
