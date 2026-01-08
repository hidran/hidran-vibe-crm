import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pdf } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoices/pdf/InvoiceDocument";
import { Tables } from "@/integrations/supabase/types";

type InvoiceWithDetails = Tables<"invoices"> & {
    invoice_line_items: Tables<"invoice_line_items">[];
    client: Tables<"clients"> | null;
    organizations: Tables<"organizations"> | null;
};

export const useSendInvoice = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (invoice: InvoiceWithDetails) => {
            if (!invoice.client?.email) {
                throw new Error("Client has no email address");
            }

            // 1. Generate PDF Blob
            // calling as function to avoid JSX in .ts file
            const doc = InvoiceDocument({ invoice });
            const blob = await pdf(doc).toBlob();

            // 2. Convert Blob to Base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const pdfBase64 = await base64Promise;

            // 3. Call Edge Function
            const { data, error } = await supabase.functions.invoke('send-invoice', {
                body: {
                    invoice_id: invoice.id,
                    recipient_email: invoice.client.email,
                    pdf_base64: pdfBase64,
                },
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            toast({ title: "Invoice sent successfully" });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "Failed to send invoice",
                description: error.message,
            });
        },
    });
};
