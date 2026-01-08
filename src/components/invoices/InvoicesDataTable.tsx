import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ColumnDef,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Tables } from "@/integrations/supabase/types";
import type { InvoiceWithItems } from "@/services/supabase/invoiceService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
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
import {
  Edit,
  FileText,
  Loader2,
  MoreHorizontal,
  Send,
  Trash,
} from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

type InvoiceStatus = Tables<"invoices">["status"];
const STATUS_OPTIONS: InvoiceStatus[] = ["pending", "sent", "paid"];

interface InvoicesDataTableProps {
  invoices: InvoiceWithItems[];
  isLoading: boolean;
  onPreview: (invoice: InvoiceWithItems) => void;
  onSend: (invoice: InvoiceWithItems) => void;
  onEdit: (invoice: InvoiceWithItems) => void;
  onDelete: (invoice: InvoiceWithItems) => void;
  onStatusChange: (invoice: InvoiceWithItems, status: InvoiceStatus) => void;
}

export const InvoicesDataTable = ({
  invoices,
  isLoading,
  onPreview,
  onSend,
  onEdit,
  onDelete,
  onStatusChange,
}: InvoicesDataTableProps) => {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1024);

  // Handle responsive column visibility for tablets
  useEffect(() => {
    const handleResize = () => {
      const isTabletView = window.innerWidth < 1024;
      setIsTablet(isTabletView);

      // Hide issue_date and due_date columns on tablets
      setColumnVisibility({
        issue_date: !isTabletView,
        due_date: !isTabletView,
      });
    };

    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columns = useMemo<ColumnDef<InvoiceWithItems>[]>(() => {
    return [
      {
        accessorKey: "invoice_number",
        header: "Number",
        cell: ({ row }) => <span className="font-medium">{row.original.invoice_number}</span>,
      },
      {
        accessorKey: "client",
        header: "Client",
        cell: ({ row }) => <span>{row.original.client?.name || "Unknown Client"}</span>,
      },
      {
        accessorKey: "issue_date",
        header: "Date",
        cell: ({ row }) =>
          row.original.issue_date
            ? format(new Date(row.original.issue_date), "MMM d, yyyy")
            : "-",
      },
      {
        accessorKey: "due_date",
        header: "Due Date",
        cell: ({ row }) => {
          if (!row.original.due_date) {
            return "-";
          }

          const isOverdue =
            new Date(row.original.due_date) < new Date() && row.original.status !== "paid";

          return (
            <span className={isOverdue ? "text-destructive font-medium" : ""}>
              {format(new Date(row.original.due_date), "MMM d, yyyy")}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            className="inline-flex w-[110px] justify-center"
          />
        ),
      },
      {
        accessorKey: "total_amount",
        header: () => <span className="text-right">Amount</span>,
        cell: ({ row }) => (
          <span className="text-right font-medium block">
            $
            {Number(row.original.total_amount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Invoice actions</span>,
        cell: ({ row }) => {
          const invoice = row.original;

          // Show single dropdown on tablets, multiple buttons on desktop
          if (isTablet) {
            return (
              <div className="flex items-center justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onPreview(invoice)}>
                      <FileText className="mr-2 h-4 w-4" />
                      View PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSend(invoice)}>
                      <Send className="mr-2 h-4 w-4" />
                      Send Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(invoice)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FileText className="mr-2 h-4 w-4" />
                        Change Status
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {STATUS_OPTIONS.map((status) => (
                          <DropdownMenuItem
                            key={status}
                            disabled={status === invoice.status}
                            onClick={() => onStatusChange(invoice, status)}
                          >
                            {status}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(invoice)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          }

          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="View PDF"
                aria-label="View invoice PDF"
                onClick={() => onPreview(invoice)}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Send invoice"
                aria-label="Send invoice"
                onClick={() => onSend(invoice)}
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Edit invoice"
                aria-label="Edit invoice"
                onClick={() => onEdit(invoice)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                title="Delete invoice"
                aria-label="Delete invoice"
                onClick={() => onDelete(invoice)}
              >
                <Trash className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="More actions"
                    aria-label="More invoice actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                  {STATUS_OPTIONS.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={status === invoice.status}
                      onClick={() => onStatusChange(invoice, status)}
                    >
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];
  }, [isTablet, onDelete, onEdit, onPreview, onSend, onStatusChange]);

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading invoices...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
};;
