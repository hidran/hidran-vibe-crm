import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Task Drag and Drop E2E', () => {
    let testUser: { id: string; email: string };
    let organization: { id: string; name: string };
    let project: { id: string; name: string };
    let backlogTaskId: string;
    let todoTaskId: string;
    let inProgressTaskId: string;

    test.beforeAll(async () => {
        // Create test user
        const email = `drag-drop-user-${Date.now()}@test.com`;
        const { data: user, error: userError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
        });
        if (userError) throw userError;
        testUser = { id: user.user!.id, email };

        // Create organization
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
                name: `Test Org ${Date.now()}`,
                slug: `test-org-${Date.now()}`,
            })
            .select()
            .single();
        if (orgError) throw orgError;
        organization = org;

        // Add user to organization
        await supabase.from('organization_members').insert({
            organization_id: organization.id,
            user_id: testUser.id,
            role: 'admin',
        });

        // Create project
        const { data: proj, error: projError } = await supabase
            .from('projects')
            .insert({
                organization_id: organization.id,
                name: `Test Project ${Date.now()}`,
                status: 'active',
            })
            .select()
            .single();
        if (projError) throw projError;
        project = proj;

        // Create test tasks in different columns
        const { data: backlogTask } = await supabase
            .from('tasks')
            .insert({
                organization_id: organization.id,
                project_id: project.id,
                title: 'Backlog Task - Drag Me',
                status: 'backlog',
                priority: 'medium',
                position: 0,
            })
            .select()
            .single();
        backlogTaskId = backlogTask!.id;

        const { data: todoTask } = await supabase
            .from('tasks')
            .insert({
                organization_id: organization.id,
                project_id: project.id,
                title: 'Todo Task 1',
                status: 'todo',
                priority: 'high',
                position: 0,
            })
            .select()
            .single();
        todoTaskId = todoTask!.id;

        const { data: inProgressTask } = await supabase
            .from('tasks')
            .insert({
                organization_id: organization.id,
                project_id: project.id,
                title: 'In Progress Task',
                status: 'in_progress',
                priority: 'urgent',
                position: 0,
            })
            .select()
            .single();
        inProgressTaskId = inProgressTask!.id;
    });

    const login = async (page: Page) => {
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
    };

    const goToTasks = async (page: Page) => {
        await page.goto('http://localhost:8080/tasks');
        await page.waitForSelector('text=Tasks');
        // Wait for kanban board to load
        await page.waitForSelector('text=Backlog');
        await page.waitForSelector('text=To Do');
        await page.waitForSelector('text=In Progress');
    };

    test('should drag task from Backlog to Todo column', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);
        await goToTasks(page);

        // Verify task is in Backlog column
        const backlogColumn = page.locator('text=Backlog').locator('..').locator('..');
        await expect(backlogColumn.locator('text=Backlog Task - Drag Me')).toBeVisible();

        // Find the task card
        const taskCard = page.locator('text=Backlog Task - Drag Me').locator('..');

        // Find the Todo column content area
        const todoColumn = page.locator('text=To Do').locator('..').locator('..');

        // Perform drag and drop
        await taskCard.dragTo(todoColumn);

        // Wait for the mutation to complete
        await page.waitForTimeout(1000);

        // Verify task is now in Todo column
        await expect(todoColumn.locator('text=Backlog Task - Drag Me')).toBeVisible();

        // Verify task is not in Backlog column anymore
        await expect(backlogColumn.locator('text=Backlog Task - Drag Me')).not.toBeVisible();

        // Verify in database
        const { data: task } = await supabase
            .from('tasks')
            .select('status')
            .eq('id', backlogTaskId)
            .single();

        expect(task?.status).toBe('todo');
    });

    test('should drag task from Todo to In Progress column', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);
        await goToTasks(page);

        // Find the task card in Todo column
        const todoColumn = page.locator('text=To Do').locator('..').locator('..');
        await expect(todoColumn.locator('text=Todo Task 1')).toBeVisible();

        const taskCard = todoColumn.locator('text=Todo Task 1').locator('..');

        // Find the In Progress column
        const inProgressColumn = page.locator('text=In Progress').locator('..').locator('..');

        // Perform drag and drop
        await taskCard.dragTo(inProgressColumn);

        // Wait for the mutation to complete
        await page.waitForTimeout(1000);

        // Verify task is now in In Progress column
        await expect(inProgressColumn.locator('text=Todo Task 1')).toBeVisible();

        // Verify task is not in Todo column anymore
        await expect(todoColumn.locator('text=Todo Task 1')).not.toBeVisible();

        // Verify in database
        const { data: task } = await supabase
            .from('tasks')
            .select('status')
            .eq('id', todoTaskId)
            .single();

        expect(task?.status).toBe('in_progress');
    });

    test('should drag task to Done column', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);
        await goToTasks(page);

        // Find the task in In Progress column
        const inProgressColumn = page.locator('text=In Progress').locator('..').locator('..');
        await expect(inProgressColumn.locator('text=In Progress Task')).toBeVisible();

        const taskCard = inProgressColumn.locator('text=In Progress Task').locator('..');

        // Find the Done column
        const doneColumn = page.locator('text=Done').locator('..').locator('..');

        // Perform drag and drop
        await taskCard.dragTo(doneColumn);

        // Wait for the mutation to complete
        await page.waitForTimeout(1000);

        // Verify task is now in Done column
        await expect(doneColumn.locator('text=In Progress Task')).toBeVisible();

        // Verify task is not in In Progress column anymore
        await expect(inProgressColumn.locator('text=In Progress Task')).not.toBeVisible();

        // Verify in database
        const { data: task } = await supabase
            .from('tasks')
            .select('status')
            .eq('id', inProgressTaskId)
            .single();

        expect(task?.status).toBe('done');
    });

    test('should reorder tasks within the same column', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);
        await goToTasks(page);

        // Create two more tasks in Todo column
        const { data: task1 } = await supabase
            .from('tasks')
            .insert({
                organization_id: organization.id,
                project_id: project.id,
                title: 'First Todo Task',
                status: 'todo',
                priority: 'low',
                position: 0,
            })
            .select()
            .single();

        const { data: task2 } = await supabase
            .from('tasks')
            .insert({
                organization_id: organization.id,
                project_id: project.id,
                title: 'Second Todo Task',
                status: 'todo',
                priority: 'low',
                position: 1,
            })
            .select()
            .single();

        // Reload to see new tasks
        await page.reload();
        await page.waitForSelector('text=First Todo Task');
        await page.waitForSelector('text=Second Todo Task');

        const todoColumn = page.locator('text=To Do').locator('..').locator('..');

        // Find both task cards
        const firstTask = todoColumn.locator('text=First Todo Task').locator('..');
        const secondTask = todoColumn.locator('text=Second Todo Task').locator('..');

        // Drag second task to first position (above first task)
        await secondTask.dragTo(firstTask);

        // Wait for the mutation to complete
        await page.waitForTimeout(1000);

        // Get all tasks in the column to verify order
        const tasksInColumn = todoColumn.locator('[draggable="true"]');
        const taskTexts = await tasksInColumn.allTextContents();

        // Second task should now appear before First task
        const secondTaskIndex = taskTexts.findIndex(text => text.includes('Second Todo Task'));
        const firstTaskIndex = taskTexts.findIndex(text => text.includes('First Todo Task'));

        expect(secondTaskIndex).toBeLessThan(firstTaskIndex);
    });

    test('should show visual feedback during drag', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);
        await goToTasks(page);

        // Create a task to drag
        await supabase
            .from('tasks')
            .insert({
                organization_id: organization.id,
                project_id: project.id,
                title: 'Visual Test Task',
                status: 'backlog',
                priority: 'medium',
                position: 0,
            })
            .select()
            .single();

        await page.reload();
        await page.waitForSelector('text=Visual Test Task');

        const taskCard = page.locator('text=Visual Test Task').locator('..');

        // Start dragging
        await taskCard.hover();
        await page.mouse.down();

        // The dragged task should have opacity-50 class
        await expect(taskCard).toHaveClass(/opacity-50/);

        // Move to another column
        const todoColumn = page.locator('text=To Do').locator('..').locator('..');
        await todoColumn.hover();

        // Complete the drag
        await page.mouse.up();

        // Wait for mutation
        await page.waitForTimeout(500);

        // Task should no longer have opacity-50 after drop
        const movedTask = todoColumn.locator('text=Visual Test Task').locator('..');
        await expect(movedTask).not.toHaveClass(/opacity-50/);
    });

    test('should handle drag across all columns in sequence', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);
        await goToTasks(page);

        // Create a task to drag through all columns
        const { data: task } = await supabase
            .from('tasks')
            .insert({
                organization_id: organization.id,
                project_id: project.id,
                title: 'Journey Task',
                status: 'backlog',
                priority: 'high',
                position: 0,
            })
            .select()
            .single();

        await page.reload();
        await page.waitForSelector('text=Journey Task');

        const columns = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
        const statuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];

        for (let i = 0; i < columns.length - 1; i++) {
            const currentColumn = page.locator(`text=${columns[i]}`).locator('..').locator('..');
            const nextColumn = page.locator(`text=${columns[i + 1]}`).locator('..').locator('..');

            // Verify task is in current column
            await expect(currentColumn.locator('text=Journey Task')).toBeVisible();

            // Drag to next column
            const taskCard = currentColumn.locator('text=Journey Task').locator('..');
            await taskCard.dragTo(nextColumn);

            // Wait for mutation
            await page.waitForTimeout(800);

            // Verify task moved to next column
            await expect(nextColumn.locator('text=Journey Task')).toBeVisible();

            // Verify in database
            const { data: updatedTask } = await supabase
                .from('tasks')
                .select('status')
                .eq('id', task!.id)
                .single();

            expect(updatedTask?.status).toBe(statuses[i + 1]);
        }
    });
});
