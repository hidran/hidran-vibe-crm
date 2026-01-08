import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Superadmin Projects - All Organizations Visibility', () => {
    let superadminUser: any;
    let org1Id: string;
    let org2Id: string;
    let proj1Name: string;
    let proj2Name: string;
    let proj3Name: string;

    test.beforeAll(async () => {
        // Create superadmin user
        const SAemail = `sa-all-projects-${Date.now()}@test.com`;
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

        // Create Organization 1 with 2 projects
        const { data: org1 } = await supabase.from('organizations').insert({
            name: `Company A ${Date.now()}`,
            slug: `company-a-${Date.now()}`
        }).select().single();
        org1Id = org1!.id;

        // Add superadmin as member of org1 (to test that they still see all projects)
        await supabase.from('organization_members').insert({
            organization_id: org1Id,
            user_id: superadminUser.id,
            role: 'owner'
        });

        proj1Name = `Project A1 ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org1Id,
            name: proj1Name,
            status: 'active'
        });

        proj2Name = `Project A2 ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org1Id,
            name: proj2Name,
            status: 'planning'
        });

        // Create Organization 2 with 1 project (superadmin is NOT a member)
        const { data: org2 } = await supabase.from('organizations').insert({
            name: `Company B ${Date.now()}`,
            slug: `company-b-${Date.now()}`
        }).select().single();
        org2Id = org2!.id;

        proj3Name = `Project B1 ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org2Id,
            name: proj3Name,
            status: 'active'
        });
    });

    test('Superadmin sees ALL projects even when they are a member of one organization', async ({ page }) => {
        // Login as superadmin
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

        // Verify ALL THREE projects are visible
        // Even though superadmin is only a member of org1, they should see org2's project too
        const table = page.locator('table');

        console.log('Checking for Project A1...');
        await expect(table.locator(`tr:has-text("${proj1Name}")`)).toBeVisible();

        console.log('Checking for Project A2...');
        await expect(table.locator(`tr:has-text("${proj2Name}")`)).toBeVisible();

        console.log('Checking for Project B1 (from different org)...');
        await expect(table.locator(`tr:has-text("${proj3Name}")`)).toBeVisible();

        console.log('✅ Superadmin can see ALL projects from ALL organizations');
        console.log('✅ This includes projects from organizations they are NOT a member of');
    });
});
