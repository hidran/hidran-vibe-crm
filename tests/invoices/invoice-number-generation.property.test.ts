/**
 * Property-Based Tests for Invoice Number Generation
 * Feature: invoice-management
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import { generateInvoiceNumber } from '../lib/invoiceUtils';

// Initialize Supabase client
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

describe('Invoice Number Generation Property Tests', () => {
    const createOrg = async () => {
        const { data } = await supabase
            .from('organizations')
            .insert({
                name: `Test Num Org ${Date.now()}-${Math.random()}`,
                slug: `test-num-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            })
            .select()
            .single();
        return data;
    };

    const cleanupOrg = async (orgId: string) => {
        await supabase.from('organizations').delete().eq('id', orgId);
    };

    /**
     * Property 3: Invoice number format compliance
     * Validates: Requirements 8.1, 8.2, 8.3
     */
    it('Property 3: Invoice number format compliance', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constant(true),
                async () => {
                    const org = await createOrg();
                    if (!org) return;

                    try {
                        const nextNum = await generateInvoiceNumber(org.id, supabase);
                        const currentYear = new Date().getFullYear();

                        // Format check: INV-{Year}-{4Digits}
                        const regex = new RegExp(`^INV-${currentYear}-\\d{4}$`);
                        expect(nextNum).toMatch(regex);
                        expect(nextNum.endsWith('0001')).toBe(true);

                        // Create a fake invoice to increment
                        await supabase.from('invoices').insert({
                            organization_id: org.id,
                            invoice_number: nextNum, // INV-YYYY-0001
                            status: 'pending'
                        });

                        const secondNum = await generateInvoiceNumber(org.id, supabase);
                        expect(secondNum).toMatch(regex);
                        expect(secondNum.endsWith('0002')).toBe(true);

                    } finally {
                        await cleanupOrg(org.id);
                    }
                }
            ),
            { numRuns: 5 }
        );
    });

    /**
     * Property 2: Invoice numbers are unique within organization
     * Validates: Requirements 1.1, 8.5
     */
    it('Property 2: Invoice numbers are unique within organization', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 5 }),
                async (count) => {
                    const org = await createOrg();
                    if (!org) return;

                    try {
                        for (let i = 0; i < count; i++) {
                            const nextNum = await generateInvoiceNumber(org.id, supabase);

                            // Should not exist yet
                            const { data } = await supabase
                                .from('invoices')
                                .select('*')
                                .eq('organization_id', org.id)
                                .eq('invoice_number', nextNum);

                            expect(data?.length).toBe(0);

                            // Insert it
                            await supabase.from('invoices').insert({
                                organization_id: org.id,
                                invoice_number: nextNum,
                                status: 'pending'
                            });
                        }
                    } finally {
                        await cleanupOrg(org.id);
                    }
                }
            ),
            { numRuns: 5 }
        );
    });
});
