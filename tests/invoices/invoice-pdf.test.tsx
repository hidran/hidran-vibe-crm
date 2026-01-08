import { describe, it, expect } from 'vitest';
import { InvoiceDocument } from '../components/invoices/pdf/InvoiceDocument';
// We can't easily test PDF binary output, but we can check if it mounts
// Note: @react-pdf/renderer components might need mocks in Node

describe('InvoiceDocument', () => {
    it('is a valid function component', () => {
        expect(typeof InvoiceDocument).toBe('function');
    });
});
