import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSendInvoice } from '@/hooks/useSendInvoice';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({
    toBlob: vi.fn().mockResolvedValue(new Blob(['mock-pdf'], { type: 'application/pdf' })),
  })),
  StyleSheet: { create: (styles: any) => styles },
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Font: { register: vi.fn() },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockInvoice = {
  id: 'inv-1',
  invoice_number: 'INV-001',
  status: 'pending',
  client: { email: 'test@example.com' },
  invoice_line_items: [],
  organizations: { name: 'Test Org' }
} as any;

describe('useSendInvoice', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('calls send-invoice function with correct params', async () => {
        (supabase.functions.invoke as any).mockResolvedValue({ data: { message: 'Success' }, error: null });

        const { result } = renderHook(() => useSendInvoice(), { wrapper });

        await result.current.mutateAsync(mockInvoice);

        expect(supabase.functions.invoke).toHaveBeenCalledWith('send-invoice', expect.objectContaining({
            body: expect.objectContaining({
                invoice_id: 'inv-1',
                recipient_email: 'test@example.com',
            })
        }));
    });

    it('throws error if client email is missing', async () => {
        const { result } = renderHook(() => useSendInvoice(), { wrapper });
        const invalidInvoice = { ...mockInvoice, client: { email: '' } };

        await expect(result.current.mutateAsync(invalidInvoice)).rejects.toThrow('Client has no email address');
        expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });
});
