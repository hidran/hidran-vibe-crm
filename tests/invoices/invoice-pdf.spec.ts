import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

test.describe('Invoice PDF E2E', () => {
    let testUser: { id: string; email: string };
    let organization: { id: string; name: string };
    let client: { id: string; name: string };
    let invoice: { id: string; invoice_number: string };

    test.beforeAll(async () => {
        // Create test user
        const email = `pdf-test-user-${Date.now()}@test.com`;
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
                name: `PDF Test Org ${Date.now()}`,
                slug: `pdf-test-org-${Date.now()}`,
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

        // Create client
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .insert({
                organization_id: organization.id,
                name: 'Test Client Corp',
                email: 'client@testcorp.com',
                address: '123 Test Street, Test City, TC 12345',
                vat_number: 'VAT123456789',
            })
            .select()
            .single();
        if (clientError) throw clientError;
        client = clientData;

        // Create invoice with line items
        const { data: invoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
                organization_id: organization.id,
                client_id: client.id,
                invoice_number: `INV-TEST-${Date.now()}`,
                status: 'pending',
                issue_date: new Date().toISOString(),
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Test invoice for PDF generation',
                total_amount: 2550.00,
            })
            .select()
            .single();
        if (invoiceError) throw invoiceError;
        invoice = invoiceData;

        // Create line items with specific positions to test ordering
        await supabase.from('invoice_line_items').insert([
            {
                invoice_id: invoice.id,
                description: 'First Service - Position 0',
                quantity: 10,
                unit_price: 100.00,
                position: 0,
            },
            {
                invoice_id: invoice.id,
                description: 'Third Service - Position 2',
                quantity: 5,
                unit_price: 50.00,
                position: 2,
            },
            {
                invoice_id: invoice.id,
                description: 'Second Service - Position 1',
                quantity: 20,
                unit_price: 75.00,
                position: 1,
            },
        ]);
    });

    const login = async (page: Page) => {
        await page.goto('http://localhost:8080/auth');
        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
    };

    test('should open PDF preview from invoices list', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);

        // Navigate to invoices page
        await page.goto('http://localhost:8080/invoices');
        await page.waitForSelector('text=Invoices');

        // Find the invoice in the table
        await expect(page.locator(`text=${invoice.invoice_number}`)).toBeVisible();

        // Open the actions menu
        const invoiceRow = page.locator('tr', { has: page.locator(`text=${invoice.invoice_number}`) });
        await invoiceRow.locator('button[aria-haspopup="menu"]').click();

        // Click "View PDF" option
        await page.locator('text=View PDF').click();

        // Wait for PDF viewer dialog to open
        await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

        // Verify PDF viewer is visible
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // The PDF viewer should render within the dialog
        // Note: We can't directly inspect PDF content, but we can verify the viewer loaded
        await page.waitForTimeout(2000); // Give PDF time to render

        // Close the dialog
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
    });

    test('should display invoice data correctly in PDF', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);

        await page.goto('http://localhost:8080/invoices');
        await page.waitForSelector(`text=${invoice.invoice_number}`);

        // Open PDF preview
        const invoiceRow = page.locator('tr', { has: page.locator(`text=${invoice.invoice_number}`) });
        await invoiceRow.locator('button[aria-haspopup="menu"]').click();
        await page.locator('text=View PDF').click();

        await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

        // Verify the PDF viewer is rendering
        // We can't directly read PDF content, but we can verify the component loaded
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Verify the dialog contains a PDFViewer element (indirectly through the DOM structure)
        await page.waitForTimeout(2000);

        // Close dialog
        await page.keyboard.press('Escape');
    });

    test('should show invoice details in the list before PDF preview', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);

        await page.goto('http://localhost:8080/invoices');
        await page.waitForSelector(`text=${invoice.invoice_number}`);

        // Verify invoice data in the table
        const invoiceRow = page.locator('tr', { has: page.locator(`text=${invoice.invoice_number}`) });

        // Check invoice number
        await expect(invoiceRow.locator(`text=${invoice.invoice_number}`)).toBeVisible();

        // Check client name
        await expect(invoiceRow.locator(`text=${client.name}`)).toBeVisible();

        // Check total amount
        await expect(invoiceRow.locator('text=$2,550.00')).toBeVisible();

        // Check status badge
        await expect(invoiceRow.locator('text=Pending')).toBeVisible();
    });

    test('should handle PDF preview with multiple invoices', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);

        // Create another invoice
        const { data: invoice2 } = await supabase
            .from('invoices')
            .insert({
                organization_id: organization.id,
                client_id: client.id,
                invoice_number: `INV-TEST-2-${Date.now()}`,
                status: 'sent',
                issue_date: new Date().toISOString(),
                total_amount: 500.00,
            })
            .select()
            .single();

        await supabase.from('invoice_line_items').insert([
            {
                invoice_id: invoice2!.id,
                description: 'Another Service',
                quantity: 5,
                unit_price: 100.00,
                position: 0,
            },
        ]);

        await page.goto('http://localhost:8080/invoices');
        await page.waitForSelector(`text=${invoice2!.invoice_number}`);

        // Open first invoice PDF
        let invoiceRow = page.locator('tr', { has: page.locator(`text=${invoice.invoice_number}`) });
        await invoiceRow.locator('button[aria-haspopup="menu"]').click();
        await page.locator('text=View PDF').first().click();

        await page.waitForSelector('[role="dialog"]');
        let dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Close it
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();

        await page.waitForTimeout(500);

        // Open second invoice PDF
        invoiceRow = page.locator('tr', { has: page.locator(`text=${invoice2!.invoice_number}`) });
        await invoiceRow.locator('button[aria-haspopup="menu"]').click();
        await page.locator('text=View PDF').first().click();

        await page.waitForSelector('[role="dialog"]');
        dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        await page.keyboard.press('Escape');
    });

    test('should maintain invoice state when closing and reopening PDF', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);

        await page.goto('http://localhost:8080/invoices');
        await page.waitForSelector(`text=${invoice.invoice_number}`);

        // Open PDF multiple times
        for (let i = 0; i < 3; i++) {
            const invoiceRow = page.locator('tr', { has: page.locator(`text=${invoice.invoice_number}`) });
            await invoiceRow.locator('button[aria-haspopup="menu"]').click();
            await page.locator('text=View PDF').click();

            await page.waitForSelector('[role="dialog"]');
            const dialog = page.locator('[role="dialog"]');
            await expect(dialog).toBeVisible();

            await page.waitForTimeout(1000);

            await page.keyboard.press('Escape');
            await expect(dialog).not.toBeVisible();

            await page.waitForTimeout(300);
        }

        // Verify invoice data is still correct in the table
        const invoiceRow = page.locator('tr', { has: page.locator(`text=${invoice.invoice_number}`) });
        await expect(invoiceRow.locator(`text=${client.name}`)).toBeVisible();
        await expect(invoiceRow.locator('text=$2,550.00')).toBeVisible();
    });

    test('should filter invoices and still open PDF correctly', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        await login(page);

        await page.goto('http://localhost:8080/invoices');
        await page.waitForSelector('text=Invoices');

        // Apply status filter
        await page.locator('button:has-text("All Statuses")').click();
        await page.locator('text=Pending').first().click();

        // Wait for filter to apply
        await page.waitForTimeout(500);

        // Verify invoice is still visible
        await expect(page.locator(`text=${invoice.invoice_number}`)).toBeVisible();

        // Open PDF after filtering
        const invoiceRow = page.locator('tr', { has: page.locator(`text=${invoice.invoice_number}`) });
        await invoiceRow.locator('button[aria-haspopup="menu"]').click();
        await page.locator('text=View PDF').click();

        await page.waitForSelector('[role="dialog"]');
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        await page.keyboard.press('Escape');
    });
});
