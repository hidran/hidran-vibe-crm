import { describe, it, expect } from 'vitest';
import { invoiceSchema } from '../components/invoices/types';

describe('Invoice Form Validation', () => {
    const validInvoice = {
        client_id: 'client-uuid',
        invoice_number: 'INV-2024-0001',
        status: 'pending',
        issue_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        notes: 'Test notes',
        items: [
            { description: 'Item 1', quantity: 1, unit_price: 100 }
        ]
    };

    it('validates a correct invoice', () => {
        const result = invoiceSchema.safeParse(validInvoice);
        expect(result.success).toBe(true);
    });

    it('fails if client is missing', () => {
        const result = invoiceSchema.safeParse({ ...validInvoice, client_id: '' });
        expect(result.success).toBe(false);
    });

    it('fails if invoice number is missing', () => {
        const result = invoiceSchema.safeParse({ ...validInvoice, invoice_number: '' });
        expect(result.success).toBe(false);
    });

    it('fails if no line items', () => {
        const result = invoiceSchema.safeParse({ ...validInvoice, items: [] });
        expect(result.success).toBe(false);
    });

    it('fails if line item has invalid quantity', () => {
        const items = [{ description: 'Item', quantity: 0, unit_price: 100 }];
        const result = invoiceSchema.safeParse({ ...validInvoice, items });
        expect(result.success).toBe(false);
    });

    it('fails if line item has negative price', () => {
        const items = [{ description: 'Item', quantity: 1, unit_price: -10 }];
        const result = invoiceSchema.safeParse({ ...validInvoice, items });
        expect(result.success).toBe(false);
    });

    it('fails if due date is before issue date', () => {
        const result = invoiceSchema.safeParse({
            ...validInvoice,
            issue_date: new Date('2024-02-01'),
            due_date: new Date('2024-01-01')
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("Due date cannot be before issue date");
        }
    });

    it('allows due date to be equal to issue date', () => {
        const result = invoiceSchema.safeParse({
            ...validInvoice,
            issue_date: new Date('2024-01-01'),
            due_date: new Date('2024-01-01')
        });
        expect(result.success).toBe(true);
    });
});
