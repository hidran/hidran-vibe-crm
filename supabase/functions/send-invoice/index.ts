
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SendInvoiceRequest {
    invoice_id: string;
    recipient_email: string;
    pdf_base64: string;
}

serve(async (req) => {
    // SECURITY FIX (2026-01-08): Use origin whitelist instead of wildcard
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const emailSendingDisabled = !resendApiKey;

        const { invoice_id, recipient_email, pdf_base64 } = await req.json() as SendInvoiceRequest;

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        // Fetch invoice number strictly for email subject if possible, 
        // OR just use ID for now as requested.
        // We can optionally fetch the invoice to get the actual number.
        const { data: invoice } = await supabaseClient
            .from("invoices")
            .select("invoice_number")
            .eq("id", invoice_id)
            .single();

        const invoiceDisplay = invoice?.invoice_number || invoice_id;

        let emailResponseId: string | null = null;
        let responseMessage = `Invoice ${invoiceDisplay} processed successfully.`;

        if (emailSendingDisabled) {
            console.warn("RESEND_API_KEY is not set. Skipping email delivery and only updating invoice status.");
        } else {
            const resend = new Resend(resendApiKey!);

            console.log(`Sending invoice ${invoiceDisplay} to ${recipient_email}`);

            const { data: emailData, error: emailError } = await resend.emails.send({
                from: "Vibe CRM <onboarding@resend.dev>", // TODO: Configure Verified Domain
                to: [recipient_email],
                subject: `New Invoice: ${invoiceDisplay}`,
                html: `
                    <h1>Invoice ${invoiceDisplay}</h1>
                    <p>Hello,</p>
                    <p>Please find attached the invoice ${invoiceDisplay}.</p>
                    <p>Best regards,<br/>Vibe CRM Team</p>
                `,
                attachments: [
                    {
                        filename: `Invoice-${invoiceDisplay}.pdf`,
                        content: pdf_base64,
                    },
                ],
            });

            if (emailError) {
                console.error("Resend API Error:", emailError);
                throw new Error(`Failed to send email: ${emailError.message}`);
            }

            emailResponseId = emailData?.id ?? null;
            responseMessage = `Invoice ${invoiceDisplay} emailed successfully.`;
        }

        // 3. Update Invoice Status
        const { error: updateError } = await supabaseClient
            .from("invoices")
            .update({ status: "sent" })
            .eq("id", invoice_id);

        if (updateError) {
            console.error("Failed to update invoice status:", updateError);
            // We don't throw here because email was sent successfully
        }

        if (emailSendingDisabled) {
            responseMessage = `${responseMessage} Email delivery skipped (RESEND_API_KEY not configured).`;
        }

        return new Response(
            JSON.stringify({
                message: responseMessage,
                id: emailResponseId,
                emailSkipped: emailSendingDisabled,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
