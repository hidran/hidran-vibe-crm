/*
 * useInvoices - React Query hook for managing invoice data operations
 *
 * This module provides query and mutation hooks for invoice CRUD operations
 * with support for line items and pagination. Invoices track financial transactions
 * for clients and can be filtered by status, date range, and client.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsSuperadmin } from "./useIsSuperadmin";
import {
  invoiceService,
  type InvoiceInsert,
  type InvoiceLineItemInsert,
  type InvoiceLineItemUpdate,
  type InvoiceUpdate,
  type InvoiceFilters,
} from "@/services/supabase/invoiceService";

/* Configuration for invoice list queries with optional filtering and pagination */
interface UseInvoicesOptions {
  filters?: InvoiceFilters;
  pagination?: {
    page: number;
    pageSize: number;
  };
}

/*
 * Fetch invoices with optional filtering and pagination.
 *
 * BEHAVIOR:
 * - Superadmins: fetch all invoices across all organizations
 * - Regular users: fetch only invoices in their specified organization
 *
 * Filters can include: status, date range, client ID, and amount constraints.
 * Pagination is applied server-side with optional filtering.
 * Query key includes isSuperadmin to refetch when privilege level changes.
 */
export const useInvoices = (
  organizationId: string | undefined,
  options?: UseInvoicesOptions,
) => {
  const { data: isSuperadmin } = useIsSuperadmin();
  const filters = options?.filters;
  const pagination = options?.pagination;

  return useQuery({
    queryKey: ["invoices", organizationId, filters, pagination, isSuperadmin],
    queryFn: () =>
      invoiceService.list({
        organizationId,
        filters,
        pagination,
        isSuperadmin,
      }),
    enabled: isSuperadmin || !!organizationId,
  });
};

/*
 * Fetch a single invoice by ID including line items.
 *
 * Returns null if invoiceId is not provided. Query is disabled until
 * a valid invoiceId is available.
 */
export const useInvoice = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => invoiceService.getById(invoiceId),
    enabled: !!invoiceId,
  });
};

/*
 * Create a new invoice with line items.
 *
 * Accepts both the invoice record and an array of line items. These are
 * created together in a transaction to ensure data consistency.
 * Invalidates the invoice list for the organization after creation.
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoice,
      items,
    }: {
      invoice: InvoiceInsert;
      items: InvoiceLineItemInsert[];
    }) => {
      return invoiceService.create({ invoice, items });
    },
    onSuccess: (data) => {
      /* Invalidate organization invoice list to reflect new invoice */
      queryClient.invalidateQueries({ queryKey: ["invoices", data.organization_id] });
    },
  });
};

/*
 * Update an existing invoice with line item modifications.
 *
 * Supports three types of line item changes:
 * - created: new line items to insert
 * - updated: existing line items to update
 * - deleted: line item IDs to remove
 *
 * Invalidates both the invoice list and the specific invoice query
 * to keep all views synchronized.
 */
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      items,
    }: {
      id: string;
      updates: InvoiceUpdate;
      items?: {
        created?: InvoiceLineItemInsert[];
        updated?: InvoiceLineItemUpdate[];
        deleted?: string[];
      };
    }) => {
      return invoiceService.update({
        id,
        updates,
        items,
      });
    },
    onSuccess: (data) => {
      /* Invalidate list and detail views to reflect all changes */
      queryClient.invalidateQueries({ queryKey: ["invoices", data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
    },
  });
};

/*
 * Delete an invoice record.
 *
 * Requires both invoice ID and organization ID for proper cache invalidation.
 * Invalidates both the list and the detail view queries.
 * Note: Deleting an invoice should typically be avoided for financial records;
 * consider using status updates instead (e.g., marking as "cancelled").
 */
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      return invoiceService.remove({ id, organizationId });
    },
    onSuccess: (data) => {
      /* Invalidate both list and detail queries after deletion */
      queryClient.invalidateQueries({ queryKey: ["invoices", data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
    },
  });
};
