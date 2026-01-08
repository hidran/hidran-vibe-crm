
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Invoices E2E', () => {
    let superadminUser: any;
    let org1Id: string;
    let org2Id: string;
    let invoice1Number: string;
    let invoice2Number: string;

    test.beforeAll(async () => {
        // 1. Create Superadmin
        const SAemail = `superadmin-${Date.now()}@test.com`;
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

        // 2. Create Org 1 + Client 1 + Invoice 1
        const { data: org1 } = await supabase.from('organizations').insert({
            name: `Org 1 ${Date.now()}`,
            slug: `org1-${Date.now()}`
        }).select().single();
        org1Id = org1!.id;

        const { data: client1 } = await supabase.from('clients').insert({
            organization_id: org1Id,
            name: 'Client 1',
            status: 'active'
        }).select().single();

        invoice1Number = `INV1-${Date.now()}`;
        await supabase.from('invoices').insert({
            organization_id: org1Id,
            client_id: client1!.id,
            invoice_number: invoice1Number,
            status: 'pending',
            issue_date: new Date().toISOString(),
            total_amount: 100
        });

        // 3. Create Org 2 + Client 2 + Invoice 2
        const { data: org2 } = await supabase.from('organizations').insert({
            name: `Org 2 ${Date.now()}`,
            slug: `org2-${Date.now()}`
        }).select().single();
        org2Id = org2!.id;

        const { data: client2 } = await supabase.from('clients').insert({
            organization_id: org2Id,
            name: 'Client 2',
            status: 'active'
        }).select().single();

        invoice2Number = `INV2-${Date.now()}`;
        await supabase.from('invoices').insert({
            organization_id: org2Id,
            client_id: client2!.id,
            invoice_number: invoice2Number,
            status: 'pending',
            issue_date: new Date().toISOString(),
            total_amount: 200
        });
    });

    const login = async (page: any) => {
        await page.goto('http://localhost:8081/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:8081/dashboard', { timeout: 15000 });
    };

    test('Superadmin can see invoices from ALL organizations', async ({ page }) => {
        await login(page);

        // Go to Invoices page
        await page.goto('http://localhost:8081/invoices');

        // Wait for table to load
        await page.waitForSelector('table');

        // Verify both invoice numbers are present
        // Use text locator
        const inv1 = page.locator(`text=${invoice1Number}`);
        const inv2 = page.locator(`text=${invoice2Number}`);

        await expect(inv1).toBeVisible({ timeout: 10000 });
        await expect(inv2).toBeVisible({ timeout: 10000 });
    });
});
