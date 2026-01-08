import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Superadmin Projects Management', () => {
    let superadminUser: any;
    let org1Id: string;
    let org2Id: string;
    let proj1Name: string;
    let proj2Name: string;

    test.beforeAll(async () => {
        // Create superadmin
        const SAemail = `sa-projects-${Date.now()}@test.com`;
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
            name: `Tech Corp ${Date.now()}`,
            slug: `tech-corp-${Date.now()}`
        }).select().single();
        org1Id = org1!.id;

        proj1Name = `Website Redesign ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org1Id,
            name: proj1Name,
            status: 'active',
            priority: 'high'
        });

        // Create Organization 2 with Project 2
        const { data: org2 } = await supabase.from('organizations').insert({
            name: `Design Studio ${Date.now()}`,
            slug: `design-studio-${Date.now()}`
        }).select().single();
        org2Id = org2!.id;

        proj2Name = `Mobile App ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org2Id,
            name: proj2Name,
            status: 'planning',
            priority: 'medium'
        });
    });

    test('Superadmin can see all projects from all organizations', async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });

        // Navigate to Projects page
        await page.goto('http://localhost:8080/projects');
        await page.waitForSelector('text=Projects');

        // Verify both projects from different organizations are visible
        await expect(page.locator(`tr:has-text("${proj1Name}")`).first()).toBeVisible();
        await expect(page.locator(`tr:has-text("${proj2Name}")`).first()).toBeVisible();

        console.log('✅ Superadmin can see projects from all organizations');
    });

    test('Superadmin can edit projects from any organization', async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });

        // Navigate to Projects page
        await page.goto('http://localhost:8080/projects');
        await page.waitForSelector('text=Projects');

        // Find and click the edit button for the first project
        const projectRow = page.locator(`tr:has-text("${proj1Name}")`).first();
        await projectRow.locator('button').first().click();
        await page.click('text=Edit');

        // Wait for navigation to edit page
        await page.waitForURL('**/projects/*/edit');

        // Verify we're on the edit page
        await expect(page.locator('text=Edit Project')).toBeVisible();
        await expect(page.locator(`input[value="${proj1Name}"]`)).toBeVisible();

        // Make a change
        const updatedName = `${proj1Name} - Updated`;
        await page.fill('input[placeholder="Project name"]', updatedName);
        await page.click('button[type="submit"]:has-text("Update Project")');

        // Verify success
        await expect(page.locator('text=Project updated successfully')).toBeVisible();
        await page.waitForURL('**/projects');

        // Verify the updated name appears in the list
        await expect(page.locator(`tr:has-text("${updatedName}")`).first()).toBeVisible();

        console.log('✅ Superadmin can edit projects from any organization');
    });

    test('Superadmin can delete projects from any organization', async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });

        // Navigate to Projects page
        await page.goto('http://localhost:8080/projects');
        await page.waitForSelector('text=Projects');

        // Find and click the delete button for the second project
        const projectRow = page.locator(`tr:has-text("${proj2Name}")`).first();
        await projectRow.locator('button').first().click();
        await page.click('text=Delete');

        // Confirm deletion in the alert dialog
        await expect(page.locator('text=Delete Project')).toBeVisible();
        await expect(page.locator(`text="${proj2Name}"`)).toBeVisible();
        await page.click('button:has-text("Delete")');

        // Verify success
        await expect(page.locator('text=Project deleted successfully')).toBeVisible();

        // Verify the project is no longer in the list
        await expect(page.locator(`tr:has-text("${proj2Name}")`)).not.toBeVisible();

        console.log('✅ Superadmin can delete projects from any organization');
    });

    test('Superadmin can create projects for any organization', async ({ page }) => {
        // Login
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });

        // Navigate to Projects page
        await page.goto('http://localhost:8080/projects');
        await page.waitForSelector('text=Projects');

        // Click New Project button
        await page.click('button:has-text("New Project")');
        await page.waitForURL('**/projects/new');

        // Fill in project details
        const newProjectName = `New Project ${Date.now()}`;
        await page.fill('input[placeholder="Project name"]', newProjectName);
        await page.fill('textarea[placeholder*="description"]', 'Test project created by superadmin');

        // Select an organization (should see both organizations)
        await page.click('button:has-text("Select organization")');

        // Verify both organizations are visible
        await expect(page.locator('text=Tech Corp')).toBeVisible();
        await expect(page.locator('text=Design Studio')).toBeVisible();

        // Select the first organization
        await page.click('text=Tech Corp');

        // Submit the form
        await page.click('button[type="submit"]:has-text("Create Project")');

        // Verify success
        await expect(page.locator('text=Project created successfully')).toBeVisible();
        await page.waitForURL('**/projects');

        // Verify the new project appears in the list
        await expect(page.locator(`tr:has-text("${newProjectName}")`).first()).toBeVisible();

        console.log('✅ Superadmin can create projects for any organization');
    });
});
