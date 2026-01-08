
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Task Management (Superadmin)', () => {
    let superadminUser: any;
    let orgA: any, clientA: any, projectA: any;
    let orgB: any, clientB: any, projectB: any;

    test.beforeAll(async () => {
        // Create Superadmin
        const email = `superadmin-task-${Date.now()}@test.com`;
        const { data: user, error: userError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { is_superadmin: true }
        });
        if (userError) throw userError;
        superadminUser = user.user;
        await supabase.from('profiles').update({ is_superadmin: true }).eq('id', superadminUser.id);
        await supabase.from('user_roles').insert({ user_id: superadminUser.id, role: 'superadmin' });

        // Helper to create org structure
        const createOrgStructure = async (suffix: string) => {
            // Org
            const { data: org } = await supabase.from('organizations').insert({
                name: `Org ${suffix} ${Date.now()}`,
                slug: `org-${suffix}-${Date.now()}`
            }).select().single();

            // Client
            const { data: client } = await supabase.from('clients').insert({
                organization_id: org.id,
                name: `Client ${suffix} ${Date.now()}`,
                status: 'active'
            }).select().single();

            // Project
            const { data: project } = await supabase.from('projects').insert({
                organization_id: org.id,
                client_id: client.id,
                name: `Project ${suffix} ${Date.now()}`,
                status: 'active'
            }).select().single();

            // Task
            await supabase.from('tasks').insert({
                organization_id: org.id,
                project_id: project.id,
                title: `Task ${suffix}`,
                status: 'todo'
            });

            return { org, client, project };
        };

        const structA = await createOrgStructure('A');
        orgA = structA.org;
        clientA = structA.client;
        projectA = structA.project;

        const structB = await createOrgStructure('B');
        orgB = structB.org;
        clientB = structB.client;
        projectB = structB.project;
    });

    const login = async (page: any) => {
        await page.goto('http://localhost:8081/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:8081/dashboard', { timeout: 15000 });
    };

    test('Superadmin can see all tasks and filter by client and project', async ({ page }) => {
        await login(page);
        await page.goto('http://localhost:8081/tasks');

        // 1. Verify "Task A" and "Task B" are visible (Global View)
        // Since we didn't select an org, useTasks(undefined) should run.
        await expect(page.getByText('Task A')).toBeVisible();
        await expect(page.getByText('Task B')).toBeVisible();

        // 2. Filter by Client A
        const clientTrigger = page.locator('button', { hasText: 'All Clients' });
        await clientTrigger.click();
        await page.getByRole('option', { name: clientA.name }).click();

        // Verify Task A is visible and Task B is hidden
        await expect(page.getByText('Task A')).toBeVisible();
        await expect(page.getByText('Task B')).toBeHidden();

        // 3. Clear Client Filter (Select All Clients)
        await clientTrigger.click();
        await page.getByRole('option', { name: 'All Clients' }).click();
        await expect(page.getByText('Task B')).toBeVisible();

        // 4. Filter by Project B
        const projectTrigger = page.locator('button', { hasText: 'All Projects' });
        await projectTrigger.click();
        await page.getByRole('option', { name: projectB.name }).click();

        // Verify Task B is visible and Task A is hidden
        await expect(page.getByText('Task B')).toBeVisible();
        await expect(page.getByText('Task A')).toBeHidden();
    });
});
