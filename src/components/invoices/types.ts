import { z } from "zod";

export const invoiceLineItemSchema = z.object({
    id: z.string().optional(), // For existing items during edit
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
    unit_price: z.coerce.number().min(0, "Price must be non-negative"),
    position: z.number().optional(), // For drag-and-drop ordering
});

export const invoiceSchema = z.object({
    organization_id: z.string().optional(),
    client_id: z.string().min(1, "Client is required"),
    invoice_number: z.string().min(1, "Invoice number is required"),
    status: z.enum(["pending", "sent", "paid"]),
    issue_date: z.date(),
    due_date: z.date().optional().nullable(),
    notes: z.string().optional(),
    items: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
}).refine((data) => {
    if (data.due_date && data.issue_date && data.due_date < data.issue_date) {
        return false;
    }
    return true;
}, {
    message: "Due date cannot be before issue date",
    path: ["due_date"],
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type InvoiceItemFormData = z.infer<typeof invoiceLineItemSchema>;
