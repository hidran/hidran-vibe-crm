import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateOrganization, useUpdateOrganization } from "@/hooks/useOrganizations";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";

type Organization = Tables<"organizations">;

const optionalText = (label: string, max = 255) =>
  z
    .string()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));

const organizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  legal_name: optionalText("Legal name"),
  tax_id: optionalText("Tax ID", 100),
  website: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  industry: optionalText("Industry"),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
}

const OrganizationDialog = ({ open, onOpenChange, organization }: OrganizationDialogProps) => {
  const { toast } = useToast();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const isMobile = useIsMobile();
  const isEditing = !!organization;

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      legal_name: "",
      tax_id: "",
      website: "",
      industry: "",
    },
  });

  useEffect(() => {
    const defaults = {
      name: organization?.name ?? "",
      legal_name: organization?.legal_name ?? "",
      tax_id: organization?.tax_id ?? "",
      website: organization?.website ?? "",
      industry: organization?.industry ?? "",
    };
    form.reset(defaults);
  }, [organization, form]);

  const normalizeField = (value?: string | null) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const onSubmit = async (data: OrganizationFormData) => {
    const payload = {
      name: data.name.trim(),
      legal_name: normalizeField(data.legal_name),
      tax_id: normalizeField(data.tax_id),
      website: normalizeField(data.website),
      industry: normalizeField(data.industry),
    };

    try {
      if (isEditing && organization) {
        await updateOrganization.mutateAsync({
          id: organization.id,
          ...payload,
        });
        toast({ 
          title: "Success",
          description: "Organization updated successfully" 
        });
      } else {
        await createOrganization.mutateAsync({
          ...payload,
        });
        toast({ 
          title: "Success",
          description: "Organization created successfully" 
        });
      }
      onOpenChange(false);
      form.reset({
        name: "",
        legal_name: "",
        tax_id: "",
        website: "",
        industry: "",
      });
    } catch (error: any) {
      console.error("Organization form submission error:", error);
      
      // Display user-friendly error message
      const errorMessage = error.message || "An unexpected error occurred. Please try again.";
      
      toast({
        variant: "destructive",
        title: isEditing ? "Failed to update organization" : "Failed to create organization",
        description: errorMessage,
      });
      
      // Highlight the name field if it's a validation error
      if (errorMessage.includes("name") || errorMessage.includes("empty") || errorMessage.includes("exists")) {
        form.setError("name", {
          type: "manual",
          message: errorMessage,
        });
      }
    }
  };

  const isPending = createOrganization.isPending || updateOrganization.isPending;

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Organization name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="legal_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Registered legal entity" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax / VAT ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., VAT123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SaaS, Consulting" {...field} />
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
            {isEditing ? "Update" : "Create"}
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
            <SheetTitle>{isEditing ? "Edit Organization" : "New Organization"}</SheetTitle>
            <SheetDescription>
              {isEditing ? "Update organization information." : "Add a new organization to the platform."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">{formContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Organization" : "New Organization"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update organization information." : "Add a new organization to the platform."}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationDialog;
