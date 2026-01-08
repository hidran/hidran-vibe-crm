
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Tasks Management E2E', () => {
    let superadminUser: any;
    let proj1Name: string;
    let proj2Name: string;

    test.beforeAll(async () => {
        // 1. Create Superadmin
        const SAemail = `superadmin-tasks-${Date.now()}@test.com`;
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
            slug: `org1-tasks-${Date.now()}`
        }).select().single();

        proj1Name = `Project 1 ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org1!.id,
            name: proj1Name,
        });

        // 3. Create Org 2 + Project 2
        const { data: org2 } = await supabase.from('organizations').insert({
            name: `Org 2 ${Date.now()}`,
            slug: `org2-tasks-${Date.now()}`
        }).select().single();

        proj2Name = `Project 2 ${Date.now()}`;
        await supabase.from('projects').insert({
            organization_id: org2!.id,
            name: proj2Name,
        });
    });

    const login = async (page: any) => {
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
    };

    test('Superadmin can see all projects from all organizations when creating a task', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);

        // Go to Tasks page
        await page.goto('http://localhost:8080/tasks');

        // Wait for page to load
        await page.waitForSelector('text=Tasks');

        // 1. Start creating a new task
        await page.click('button:has-text("New Task"), button:has-text("Create your first task")');

        // Wait for navigation to the new route (no dialog anymore)
        await page.waitForURL('**/tasks/new*');

        await page.fill('input[placeholder="Task title"]', 'Global Superadmin Task');

        // Open project selector
        await page.click('button:has-text("Select project")');

        // VISUAL TEST: Verify BOTH projects from different orgs are visible
        await expect(page.locator(`role=option >> text=${proj1Name}`)).toBeVisible();
        await expect(page.locator(`role=option >> text=${proj2Name}`)).toBeVisible();

        // Select one and finish
        await page.click(`role=option >> text=${proj1Name}`);
        await page.click('button[type="submit"]:has-text("Create Task")');

        await expect(page.locator('text=Task created successfully').first()).toBeVisible();
        await page.waitForURL('**/tasks');

        await expect(page.locator('text=Global Superadmin Task')).toBeVisible();
    });

    test('Superadmin can manage tasks across organizations and projects', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);

        // Go to Tasks page
        await page.goto('http://localhost:8080/tasks');

        // Wait for page to load
        await page.waitForSelector('text=Tasks');

        // 1. Create a task for Project 1
        await page.click('button:has-text("New Task"), button:has-text("Create your first task")');
        await page.waitForURL('**/tasks/new*');
        await page.fill('input[placeholder="Task title"]', 'Task for P1');
        await page.click('button:has-text("Select project")');
        await page.click(`role=option >> text=${proj1Name}`);
        await page.click('button[type="submit"]:has-text("Create Task")');
        await expect(page.locator('text=Task created successfully').first()).toBeVisible();

        // 2. Create a task for Project 2
        await page.click('button:has-text("New Task")');
        await page.waitForURL('**/tasks/new*');
        await page.fill('input[placeholder="Task title"]', 'Task for P2');
        await page.click('button:has-text("Select project")');
        await page.click(`role=option >> text=${proj2Name}`);
        await page.click('button[type="submit"]:has-text("Create Task")');
        await expect(page.locator('text=Task created successfully').first()).toBeVisible();

        // 3. Verify both are visible
        await expect(page.locator('text=Task for P1')).toBeVisible();
        await expect(page.locator('text=Task for P2')).toBeVisible();

        // 4. Test Filtering by Project 1
        await page.click('button:has-text("All Projects")');
        await page.click(`role=option >> text=${proj1Name}`);
        await expect(page.locator('text=Task for P1')).toBeVisible();
        await expect(page.locator('text=Task for P2')).not.toBeVisible();

        // 5. Test Filtering by Project 2
        await page.click(`button:has-text("${proj1Name}")`);
        await page.click(`role=option >> text=${proj2Name}`);
        await expect(page.locator('text=Task for P2')).toBeVisible();
        await expect(page.locator('text=Task for P1')).not.toBeVisible();
    });
});
