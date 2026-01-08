import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Plus } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useClients } from "@/hooks/useClients";
import { useCreateInvoice, useUpdateInvoice } from "@/hooks/useInvoices";
import { useGenerateInvoiceNumber } from "@/hooks/useGenerateInvoiceNumber";
import { useToast } from "@/hooks/use-toast";
import { InvoiceFormData, invoiceSchema } from "./types";
import { LineItemRow } from "./LineItemRow";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  invoice?: (Tables<"invoices"> & { invoice_line_items: Tables<"invoice_line_items">[] }) | null;
}

export const InvoiceDialog = ({ open, onOpenChange, organizationId, invoice }: InvoiceDialogProps) => {
  const { toast } = useToast();
  const { data: clients } = useClients(organizationId);
  const { data: nextInvoiceNumber, isLoading: isGeneratingNumber } = useGenerateInvoiceNumber(
    !invoice && open ? organizationId : undefined
  );
  const isMobile = useIsMobile();

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const isEditing = !!invoice;
  const isPending = createInvoice.isPending || updateInvoice.isPending;

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: "",
      invoice_number: "",
      status: "pending",
      issue_date: new Date(),
      items: [{ description: "", quantity: 1, unit_price: 0 }],
      notes: ""
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Calculate totals
  const items = form.watch("items");
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // Reset/Initialize form
  useEffect(() => {
    if (open) {
      if (invoice) {
        form.reset({
          client_id: invoice.client_id || "",
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          issue_date: invoice.issue_date ? new Date(invoice.issue_date) : new Date(),
          due_date: invoice.due_date ? new Date(invoice.due_date) : undefined,
          notes: invoice.notes || "",
          items: invoice.invoice_line_items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price),
          })),
        });
      } else {
        form.reset({
          client_id: "",
          invoice_number: "", // Will be set by nextInvoiceNumber effect
          status: "pending",
          issue_date: new Date(),
          due_date: undefined,
          notes: "",
          items: [{ description: "", quantity: 1, unit_price: 0 }],
        });
      }
    }
  }, [open, invoice, form]);

  // Set generated invoice number when available
  useEffect(() => {
    if (!isEditing && open && nextInvoiceNumber) {
      form.setValue("invoice_number", nextInvoiceNumber);
    }
  }, [nextInvoiceNumber, isEditing, open, form]);

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      if (isEditing && invoice) {
        // Calculate items to create/update/delete
        const currentItemIds = new Set(data.items.map(i => i.id).filter(Boolean));
        const deletedIds = invoice.invoice_line_items
          .filter(i => !currentItemIds.has(i.id))
          .map(i => i.id);

        const createdItems = data.items.filter(i => !i.id);
        const updatedItems = data.items.filter(i => i.id);

        await updateInvoice.mutateAsync({
          id: invoice.id,
          updates: {
             client_id: data.client_id,
             status: data.status,
             issue_date: data.issue_date.toISOString(),
             due_date: data.due_date?.toISOString(),
             notes: data.notes,
             total_amount: subtotal
          },
          items: {
            created: createdItems.map(i => ({ 
              description: i.description, 
              quantity: i.quantity, 
              unit_price: i.unit_price,
              invoice_id: invoice.id 
            })),
            updated: updatedItems.map(i => ({
              id: i.id!,
              description: i.description,
              quantity: i.quantity,
              unit_price: i.unit_price
            })),
            deleted: deletedIds
          }
        });
        toast({ title: "Invoice updated successfully" });
      } else {
        await createInvoice.mutateAsync({
          invoice: {
            organization_id: organizationId,
             client_id: data.client_id,
             invoice_number: data.invoice_number,
             status: data.status,
             issue_date: data.issue_date.toISOString(),
             due_date: data.due_date?.toISOString(),
             notes: data.notes,
             total_amount: subtotal
          },
          items: data.items.map(i => ({ 
            description: i.description, 
            quantity: i.quantity, 
            unit_price: i.unit_price,
            invoice_id: "" // Set by hook
          }))
        });
        toast({ title: "Invoice created successfully" });
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong",
      });
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Top Section: Client & Meta */}
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                           <SelectItem key={client.id} value={client.id}>
                             {client.name}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} disabled={!isEditing} /> 
                        {!isEditing && isGeneratingNumber && (
                           <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
               <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date("2100-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues("issue_date")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Line Items */}
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <h4 className="font-medium">Line Items</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: "", quantity: 1, unit_price: 0 })}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
               </div>
               
               <div className="space-y-2">
                 <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-1">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-3">Price</div>
                    <div className="col-span-1"></div>
                 </div>
                 {fields.map((field, index) => (
                    <LineItemRow
                      key={field.id}
                      id={field.id}
                      index={index}
                      control={form.control}
                      register={form.register}
                      onRemove={remove}
                      isRemoveDisabled={fields.length === 1}
                    />
                 ))}
               </div>

               <div className="flex justify-end pt-4 border-t">
                  <div className="flex items-center gap-4 text-lg font-semibold">
                     <span>Total:</span>
                     <span>${subtotal.toFixed(2)}</span>
                  </div>
               </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Payment terms, bank details, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditing ? "Edit Invoice" : "New Invoice"}</SheetTitle>
            <SheetDescription>
              {isEditing ? "Update invoice details." : "Create a new invoice for your client."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">{formContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Invoice" : "New Invoice"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update invoice details." : "Create a new invoice for your client."}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
