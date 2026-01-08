
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useParams, useNavigate } from "react-router-dom";
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
import { CalendarIcon, Loader2, Plus, ArrowLeft } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useCreateInvoice, useUpdateInvoice, useInvoice } from "@/hooks/useInvoices";
import { useGenerateInvoiceNumber } from "@/hooks/useGenerateInvoiceNumber";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { InvoiceFormData, invoiceSchema } from "@/components/invoices/types";
import { LineItemRow } from "@/components/invoices/LineItemRow";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { data: isSuperadmin = false } = useIsSuperadmin();
  const { data: organizations = [] } = useOrganizations(isSuperadmin);

  // If id is present, we are editing. Fetch invoice data.
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(id);
  const isEditing = !!id;

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      organization_id: organization?.id || "",
      client_id: "",
      invoice_number: "",
      status: "pending",
      issue_date: new Date(),
      items: [{ description: "", quantity: 1, unit_price: 0, position: 0 }],
      notes: ""
    },
  });

  const selectedOrgId = form.watch("organization_id");
  const organizationId = selectedOrgId || organization?.id || "";

  const { data: clients } = useClients(organizationId);
  
  // Only generate number if creating and we have an organization ID
  const { data: nextInvoiceNumber, isLoading: isGeneratingNumber } = useGenerateInvoiceNumber(
    !isEditing && organizationId ? organizationId : undefined
  );
  
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  
  const isPending = createInvoice.isPending || updateInvoice.isPending || isLoadingInvoice;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);
      const reorderedItems = arrayMove(fields, oldIndex, newIndex);
      // Update positions in the reordered items
      const itemsWithPositions = reorderedItems.map((item, index) => ({
        ...item,
        position: index,
      }));
      form.setValue('items', itemsWithPositions);
    }
  };

  // Calculate totals
  const items = form.watch("items");
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // Initialize form with fetched invoice or defaults
  useEffect(() => {
    if (invoice) {
        form.reset({
          organization_id: invoice.organization_id,
          client_id: invoice.client_id || "",
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          issue_date: invoice.issue_date ? new Date(invoice.issue_date) : new Date(),
          due_date: invoice.due_date ? new Date(invoice.due_date) : undefined,
          notes: invoice.notes || "",
          items: invoice.invoice_line_items && invoice.invoice_line_items.length > 0
            ? invoice.invoice_line_items
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map((item, index) => ({
                  id: item.id,
                  description: item.description,
                  quantity: Number(item.quantity) || 0,
                  unit_price: Number(item.unit_price),
                  position: item.position ?? index,
                }))
            : [{ description: "", quantity: 1, unit_price: 0, position: 0 }],
        });
    } else if (!isEditing) {
        // Handle initial organization ID
        if (organization?.id) {
            form.setValue("organization_id", organization.id);
        }
    }
  }, [invoice, isEditing, form, organization]);

  // Set generated invoice number when available (only on create)
  useEffect(() => {
    if (!isEditing && nextInvoiceNumber) {
      // Only set if different to avoid overriding user input if they typed fast? 
      // Actually usually safe to set if current value is empty.
      const current = form.getValues("invoice_number");
      if (!current) {
        form.setValue("invoice_number", nextInvoiceNumber);
      }
    }
  }, [nextInvoiceNumber, isEditing, form]);

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      if (isEditing && invoice) {
        // Calculate items to create/update/delete
        const currentItemIds = new Set(data.items.map(i => i.id).filter(Boolean));
        const deletedIds = maxItems(invoice.invoice_line_items)
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
            created: createdItems.map((i, idx) => ({
              description: i.description,
              quantity: i.quantity,
              unit_price: i.unit_price,
              position: i.position ?? idx,
              invoice_id: invoice.id
            })),
            updated: updatedItems.map((i, idx) => ({
              id: i.id!,
              description: i.description,
              quantity: i.quantity,
              unit_price: i.unit_price,
              position: i.position ?? idx
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
          items: data.items.map((i, idx) => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            position: i.position ?? idx,
            invoice_id: "" // Set by hook
          }))
        });
        toast({ title: "Invoice created successfully" });
      }
      navigate("/invoices");
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong",
      });
    }
  };

  const maxItems = (items: any[]) => items || [];

  if (isEditing && isLoadingInvoice) {
    return (
        <DashboardLayout title="Edit Invoice" description="Loading invoice details...">
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </DashboardLayout>
    );
  }

  // The main requirement: allow superadmin to edit invoice number.
  // Input disabled prop: {!isEditing && !isSuperadmin}
  // Wait, if editing, we usually don't allow changing invoice number? 
  // The user requirement was "superadmin is not able to add invoice number when creating".
  // So on create (!isEditing), it should be enabled if isSuperadmin.
  // Original code: disabled={!isEditing}. This meant ONLY when editing could it be changed? 
  // No, actually wait. if disabled={!isEditing}, then on Create, it IS disabled. 
  // So NO ONE could edit invoice number on create in the original code.
  // We want to allow it for Superadmin on Create.
  
  return (
    <DashboardLayout 
        title={isEditing ? "Edit Invoice" : "New Invoice"}
        description={isEditing ? "Update invoice details." : "Create a new invoice."}
    >
      <div className="max-w-4xl mx-auto">
        <Button 
            variant="ghost" 
            className="mb-4 pl-0 hover:pl-2 transition-all"
            onClick={() => navigate("/invoices")}
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>

        <Card>
            <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>Fill in the details below.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Top Section: Client & Meta */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isSuperadmin && !isEditing && (
                      <FormField
                        control={form.control}
                        name="organization_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization *</FormLabel>
                            <Select 
                                onValueChange={(val) => {
                                    field.onChange(val);
                                    // Reset client when org changes
                                    form.setValue("client_id", "");
                                }} 
                                value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select organization" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {organizations?.map((org) => (
                                  <SelectItem key={org.id} value={org.id}>
                                    {org.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                        control={form.control}
                        name="client_id"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Client *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!organizationId}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder={organizationId ? "Select client" : "Select organization first"} />
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
                                {/* Enabled if: isEditing OR isSuperadmin */}
                                <Input {...field} disabled={!isEditing && !isSuperadmin} /> 
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            onClick={() => append({ description: "", quantity: 1, unit_price: 0, position: fields.length })}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-1">
                            <div className="col-span-1"></div>
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2">Qty</div>
                            <div className="col-span-2">Price</div>
                            <div className="col-span-2"></div>
                        </div>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
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
                          </SortableContext>
                        </DndContext>
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
                    <Button type="button" variant="outline" onClick={() => navigate("/invoices")}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Update Invoice" : "Create Invoice"}
                    </Button>
                    </div>
                </form>
                </Form>
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceForm;
