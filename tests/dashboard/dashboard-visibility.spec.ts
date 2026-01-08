
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Dashboard Data Visibility', () => {
    let superadminUser: any;
    let regularUser: any;
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
        const saEmail = `superadmin-dash-${Date.now()}@test.com`;
        const { data: sa, error: saErr } = await supabase.auth.admin.createUser({
            email: saEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: { is_superadmin: true }
        });
        if (saErr) throw saErr;
        superadminUser = sa.user;
        await supabase.from('profiles').update({ is_superadmin: true }).eq('id', superadminUser.id);

        // 4. Create Regular User (Member of Org A)
        const regEmail = `user-dash-${Date.now()}@test.com`;
        const { data: reg, error: regErr } = await supabase.auth.admin.createUser({
            email: regEmail,
            password: 'password123',
            email_confirm: true
        });
        if (regErr) throw regErr;
        regularUser = reg.user;

        await supabase.from('organization_members').insert({
            organization_id: orgAId,
            user_id: regularUser.id,
            role: 'member'
        });

        // 5. Populate Data
        // Org A: 1 Client, 1 Project
        await supabase.from('clients').insert({ organization_id: orgAId, name: 'Client A', status: 'active' });
        await supabase.from('projects').insert({ organization_id: orgAId, name: 'Project A', status: 'active' });

        // Org B: 1 Client, 1 Project
        await supabase.from('clients').insert({ organization_id: orgBId, name: 'Client B', status: 'active' });
        await supabase.from('projects').insert({ organization_id: orgBId, name: 'Project B', status: 'active' });

    });

    const login = async (page: any, email: string) => {
        await page.goto('http://localhost:8081/auth');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:8081/dashboard', { timeout: 15000 });
    };

    test('Regular user sees only their organization data', async ({ page }) => {
        await login(page, regularUser.email);

        // Wait for stats to load
        // Search for the card by looking for the Title "Clients"
        const card = page.locator('.bg-card').filter({ has: page.locator('h3', { hasText: /^Clients$/ }) }).first();

        await expect(card).toBeVisible();

        // Check for the value. StatCard renders value in a div with text-2xl
        const valueDiv = card.locator('.text-2xl.font-bold');
        await expect(valueDiv).toBeVisible();
        await expect(valueDiv).toContainText('1');
        await expect(valueDiv).not.toContainText('2');

        const projectCard = page.locator('.bg-card').filter({ has: page.locator('h3', { hasText: /^Projects$/ }) }).first();
        await expect(projectCard.locator('.text-2xl.font-bold')).toContainText('1');
    });

    test('Superadmin sees all data (aggregate)', async ({ page }) => {
        await login(page, superadminUser.email);

        const card = page.locator('.bg-card').filter({ has: page.locator('h3', { hasText: /^Clients$/ }) }).filter({ has: page.locator('.text-2xl.font-bold') }).first();
        await expect(card).toBeVisible();
        await expect(card.locator('.text-2xl.font-bold')).toContainText('2');

        const projectCard = page.locator('.bg-card').filter({ has: page.locator('h3', { hasText: /^Projects$/ }) }).filter({ has: page.locator('.text-2xl.font-bold') }).first();
        await expect(projectCard.locator('.text-2xl.font-bold')).toContainText('2');
    });
});
