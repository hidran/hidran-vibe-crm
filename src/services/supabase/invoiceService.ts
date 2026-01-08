import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type InvoiceInsert = TablesInsert<"invoices">;
type InvoiceUpdate = TablesUpdate<"invoices">;
type InvoiceLineItemInsert = TablesInsert<"invoice_line_items">;
type InvoiceLineItemUpdate = TablesUpdate<"invoice_line_items"> & { id: string };

export interface InvoiceFilters {
  status?: string;
  clientId?: string;
  search?: string;
}

export interface InvoiceWithItems extends Invoice {
  invoice_line_items: Tables<"invoice_line_items">[];
  client: Tables<"clients"> | null;
  organizations: Tables<"organizations"> | null;
}

class InvoiceService {
  async list(params: {
    organizationId?: string;
    isSuperadmin?: boolean;
    filters?: InvoiceFilters;
    pagination?: {
      page: number;
      pageSize: number;
    };
  }): Promise<{ data: InvoiceWithItems[]; total: number }> {
    const { organizationId, isSuperadmin, filters, pagination } = params;

    if (!isSuperadmin && !organizationId) {
      return { data: [], total: 0 };
    }

    let query = supabase
      .from("invoices")
      .select(
        `
          *,
          client:clients(*),
          organizations(*),
          invoice_line_items(*)
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status as any);
    }

    if (filters?.clientId) {
      query = query.eq("client_id", filters.clientId);
    }

    if (filters?.search?.trim()) {
      const pattern = `%${filters.search.trim()}%`;
      query = query.or(
        `invoice_number.ilike.${pattern}`,
      );
    }

    if (pagination) {
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Supabase] fetch invoices failed", error);
      throw error;
    }

    return {
      data: (data ?? []) as InvoiceWithItems[],
      total: count ?? (data?.length ?? 0),
    };
  }

  async getById(invoiceId?: string | null): Promise<InvoiceWithItems | null> {
    if (!invoiceId) {
      return null;
    }

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
          *,
          invoice_line_items(*),
          client:clients(*),
          organizations(*)
        `,
      )
      .eq("id", invoiceId)
      .order("position", {
        referencedTable: "invoice_line_items",
        ascending: true,
      })
      .single();

    if (error) {
      console.error("[Supabase] fetch invoice failed", error);
      throw error;
    }

    return data as InvoiceWithItems;
  }

  async create(payload: {
    invoice: InvoiceInsert;
    items: InvoiceLineItemInsert[];
  }): Promise<Invoice> {
    const { invoice, items } = payload;

    const { data: newInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoice)
      .select()
      .single();

    if (invoiceError) {
      console.error("[Supabase] create invoice failed", invoiceError);
      throw invoiceError;
    }

    if (items.length > 0) {
      const itemsWithInvoiceId = items.map((item) => ({
        ...item,
        invoice_id: newInvoice.id,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_line_items")
        .insert(itemsWithInvoiceId);

      if (itemsError) {
        console.error("[Supabase] create invoice line items failed", itemsError);
        throw itemsError;
      }
    }

    return newInvoice as Invoice;
  }

  async update(payload: {
    id: string;
    updates: InvoiceUpdate;
    items?: {
      created?: InvoiceLineItemInsert[];
      updated?: InvoiceLineItemUpdate[];
      deleted?: string[];
    };
  }): Promise<Invoice> {
    const { id, updates, items } = payload;

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[Supabase] update invoice failed", updateError);
      throw updateError;
    }

    if (items) {
      if (items.deleted?.length) {
        const { error: deleteError } = await supabase
          .from("invoice_line_items")
          .delete()
          .in("id", items.deleted);

        if (deleteError) {
          console.error("[Supabase] delete invoice line items failed", deleteError);
          throw deleteError;
        }
      }

      if (items.created?.length) {
        const newItems = items.created.map((item) => ({ ...item, invoice_id: id }));
        const { error: createError } = await supabase
          .from("invoice_line_items")
          .insert(newItems);

        if (createError) {
          console.error("[Supabase] create invoice line items failed", createError);
          throw createError;
        }
      }

      if (items.updated?.length) {
        for (const item of items.updated) {
          const { error: itemUpdateError } = await supabase
            .from("invoice_line_items")
            .update(item)
            .eq("id", item.id);

          if (itemUpdateError) {
            console.error("[Supabase] update invoice line item failed", itemUpdateError);
            throw itemUpdateError;
          }
        }
      }
    }

    return updatedInvoice as Invoice;
  }

  async remove(payload: {
    id: string;
    organizationId: string;
  }): Promise<{ id: string; organizationId: string }> {
    const { id, organizationId } = payload;

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Supabase] delete invoice failed", error);
      throw error;
    }

    return { id, organizationId };
  }
}

export const invoiceService = new InvoiceService();

export type {
  Invoice,
  InvoiceInsert,
  InvoiceLineItemInsert,
  InvoiceLineItemUpdate,
  InvoiceUpdate,
};