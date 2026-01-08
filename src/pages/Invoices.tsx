import { useMemo, useState } from "react";
import { Plus, Search, CalendarIcon, Edit, Trash2, FileText, Send, MoreHorizontal } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useInvoices, useDeleteInvoice, useUpdateInvoice } from "@/hooks/useInvoices";
import { useSendInvoice } from "@/hooks/useSendInvoice";
import { useClients } from "@/hooks/useClients";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { InvoicePreview } from "@/components/invoices/pdf/InvoicePreview";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tables } from "@/integrations/supabase/types";
import type { InvoiceWithItems } from "@/services/supabase/invoiceService";
import { InvoicesDataTable } from "@/components/invoices/InvoicesDataTable";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDataList } from "@/components/ui/mobile-data-list";
import { format } from "date-fns";
import { StatusBadge } from "@/components/invoices/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InvoiceStatus = Tables<"invoices">["status"];

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization } = useOrganization();
  const { data: isSuperadmin } = useIsSuperadmin();
  const isMobile = useIsMobile();

  const statusFilter = (searchParams.get("status") as InvoiceStatus | "all") || "all";
  const clientIdFilter = searchParams.get("client") || "all";
  const searchQuery = searchParams.get("search") || "";

  const filters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      clientId: clientIdFilter === "all" ? undefined : clientIdFilter,
      search: searchQuery || undefined,
    }),
    [statusFilter, clientIdFilter, searchQuery],
  );

  const { data: invoiceResult, isLoading } = useInvoices(
    isSuperadmin ? undefined : organization?.id,
    {
      filters,
    },
  );

  const invoices = invoiceResult?.data ?? [];

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all" || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  const { data: clients } = useClients(organization?.id);
  const deleteInvoice = useDeleteInvoice();
  const updateInvoice = useUpdateInvoice();
  const sendInvoice = useSendInvoice();
  const { toast } = useToast();

  const [previewInvoice, setPreviewInvoice] = useState<InvoiceWithItems | null>(null);

  const handleEdit = (invoice: InvoiceWithItems) => {
    navigate(`/invoices/${invoice.id}/edit`);
  };

  const handleDelete = async (invoice: InvoiceWithItems) => {
    const organizationId = invoice.organization_id || organization?.id;
    if (!organizationId) {
      toast({ title: "Unable to determine organization", variant: "destructive" });
      return;
    }

    if (confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteInvoice.mutateAsync({ id: invoice.id, organizationId });
        toast({ title: "Invoice deleted" });
      } catch {
        toast({ title: "Error deleting invoice", variant: "destructive" });
      }
    }
  };

  const handleSend = async (invoice: InvoiceWithItems) => {
    try {
      await sendInvoice.mutateAsync(invoice);
    } catch {
      // Error handled in hook
    }
  };

  const handleStatusChange = async (invoice: InvoiceWithItems, newStatus: InvoiceStatus) => {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      pending: ["sent", "paid"],
      sent: ["paid"],
      paid: [],
    };

    if (!validTransitions[invoice.status].includes(newStatus)) {
      toast({
        title: "Invalid status transition",
        description: `Cannot change status from ${invoice.status} to ${newStatus}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        updates: { status: newStatus },
        items: { created: [], updated: [], deleted: [] },
      });
      toast({ title: `Invoice status updated to ${newStatus}` });
    } catch {
      toast({
        title: "Error updating status",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout
      title="Invoices"
      description="Manage your invoices and payments"
      actions={
        <Button onClick={() => navigate("/invoices/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Invoice
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Filter Invoices</CardTitle>
            <CardDescription>Search and filter your invoice history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoice # or client..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) =>
                    updateParams({
                      search: e.target.value,
                    })
                  }
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value: InvoiceStatus | "all") =>
                  updateParams({
                    status: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={clientIdFilter}
                onValueChange={(value) =>
                  updateParams({
                    client: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isMobile ? (
              <div className="p-4">
                <MobileDataList
                  data={invoices}
                  isLoading={isLoading}
                  renderItem={(invoice) => (
                    <Card key={invoice.id} className="cursor-pointer active:scale-[0.98] transition-transform">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-base font-medium leading-tight">
                            {invoice.invoice_number}
                          </CardTitle>
                          <StatusBadge status={invoice.status} />
                        </div>
                        <CardDescription className="text-xs">
                          {invoice.client?.name || "Unknown Client"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="flex justify-between items-center text-sm mb-3">
                          <span className="font-semibold text-lg">
                            ${Number(invoice.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <div className="flex items-center text-muted-foreground text-xs">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {invoice.due_date ? format(new Date(invoice.due_date), "MMM d") : "-"}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-3">
                          <Button variant="ghost" size="sm" className="h-11" onClick={() => setPreviewInvoice(invoice)}>
                            <FileText className="mr-2 h-4 w-4" /> View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-11 w-11">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setPreviewInvoice(invoice)}>
                                <FileText className="mr-2 h-4 w-4" /> View PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSend(invoice)}>
                                <Send className="mr-2 h-4 w-4" /> Send Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <span className="flex items-center">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Change Status
                                  </span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {(["pending", "sent", "paid"] as InvoiceStatus[]).map((status) => (
                                    <DropdownMenuItem
                                      key={status}
                                      disabled={status === invoice.status}
                                      onClick={() => handleStatusChange(invoice, status)}
                                    >
                                      {status}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(invoice)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                />
              </div>
            ) : (
              <InvoicesDataTable
                invoices={invoices}
                isLoading={isLoading}
                onPreview={(invoice) => setPreviewInvoice(invoice)}
                onSend={handleSend}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            )}
          </CardContent>
        </Card>
        {previewInvoice && (
          <InvoicePreview
            open={!!previewInvoice}
            invoice={previewInvoice}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setPreviewInvoice(null);
              }
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default InvoicesPage;
