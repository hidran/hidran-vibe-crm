
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Invoice Creation', () => {
    let superadminUser: any;
    let orgName: string;
    let clientName: string;

    test.beforeAll(async () => {
        // 1. Create Org
        orgName = `Test Org ${Date.now()}`;
        const { data: org, error: orgError } = await supabase.from('organizations').insert({
            name: orgName,
            slug: `test-org-${Date.now()}`
        }).select().single();
        if (orgError) throw orgError;
        const orgId = org.id;

        // 2. Create Superadmin
        const email = `superadmin-${Date.now()}@test.com`;
        const { data: user, error: userError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { is_superadmin: true }
        });
        if (userError) throw userError;
        superadminUser = user.user;

        // Set profile superadmin flag
        await supabase.from('profiles').update({ is_superadmin: true }).eq('id', superadminUser.id);
        // Ensure user_roles has superadmin too just in case (though profiles is what useIsSuperadmin checks)
        await supabase.from('user_roles').insert({ user_id: superadminUser.id, role: 'superadmin' });

        // 3. Create Client in Org
        clientName = `Test Client ${Date.now()}`;
        await supabase.from('clients').insert({
            organization_id: orgId,
            name: clientName,
            status: 'active'
        });
    });

    const login = async (page: any) => {
        await page.goto('http://localhost:8081/auth');
        await page.fill('input[type="email"]', superadminUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:8081/dashboard', { timeout: 15000 });
    };

    test('Superadmin can create an invoice', async ({ page }) => {
        await login(page);

        await page.goto('http://localhost:8081/invoices/new');

        // 1. Select Organization
        // Use exact match for the trigger prompt
        const orgTrigger = page.locator('button', { hasText: /^Select organization$/ });
        await orgTrigger.waitFor({ state: 'visible' });
        await orgTrigger.click();

        // Select the specific org from the dropdown content
        await page.getByRole('option', { name: orgName }).click();

        // 2. Select Client
        // Now the client trigger should be enabled.
        const clientTrigger = page.locator('button', { hasText: /^Select client$/ });
        await clientTrigger.click();
        await page.getByRole('option', { name: clientName }).click();

        // 3. Fill Invoice Number
        await page.fill('input[name="invoice_number"]', `INV-${Date.now()}`);

        // 3b. Fill Item Description (required)
        await page.fill('input[name="items.0.description"]', 'Test Service');

        // 4. Submit
        await page.click('button:has-text("Create Invoice")');

        // 5. Success Toast or Redirect
        await page.waitForURL('http://localhost:8081/invoices');
        expect(page.url()).toBe('http://localhost:8081/invoices');
    });
});
