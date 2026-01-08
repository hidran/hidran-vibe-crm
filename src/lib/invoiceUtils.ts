import { supabase as defaultClient } from "@/integrations/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generates the next invoice number for an organization.
 * Format: INV-YYYY-NNNN (e.g., INV-2024-0001)
 */
export async function generateInvoiceNumber(
    organizationId: string,
    client: SupabaseClient = defaultClient
): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    // Fetch the latest invoice for this organization in the current year
    const { data, error } = await client
        .from("invoices")
        .select("invoice_number")
        .eq("organization_id", organizationId)
        .ilike("invoice_number", `${prefix}%`)
        .order("invoice_number", { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is "No rows found"
        console.error("Error fetching latest invoice number:", error);
        // Fallback or throw? Throwing is safer to prevent duplicates if DB is down.
        throw error;
    }

    let nextSequence = 1;

    if (data?.invoice_number) {
        const parts = data.invoice_number.split("-");
        const lastSequence = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
        }
    }

    // Pad with zeros to 4 digits
    const sequenceStr = nextSequence.toString().padStart(4, "0");
    return `${prefix}${sequenceStr}`;
}
