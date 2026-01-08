import { useQuery } from "@tanstack/react-query";
import { generateInvoiceNumber } from "@/lib/invoiceUtils";

export const useGenerateInvoiceNumber = (organizationId: string | undefined) => {
    return useQuery({
        queryKey: ["next-invoice-number", organizationId],
        queryFn: () => {
            if (!organizationId) throw new Error("Organization ID is required");
            return generateInvoiceNumber(organizationId);
        },
        enabled: !!organizationId,
        staleTime: 0, // Always fetch fresh
        gcTime: 0, // Don't cache
    });
};
