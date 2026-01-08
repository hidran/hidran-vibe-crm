import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
import { useCreateOrganization, useUpdateOrganization, useOrganizations } from "@/hooks/useOrganizations";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Loader2, ArrowLeft } from "lucide-react";

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

const OrganizationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: isSuperadmin } = useIsSuperadmin();
  const { data: organizations = [], isLoading: loadingOrganizations } = useOrganizations(isSuperadmin || false);
  
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  
  const isEditing = !!id;
  const organization = organizations.find(o => o.id === id);

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
    if (isEditing && organization) {
      form.reset({
        name: organization.name,
        legal_name: organization.legal_name ?? "",
        tax_id: organization.tax_id ?? "",
        website: organization.website ?? "",
        industry: organization.industry ?? "",
      });
    } else if (!isEditing) {
      form.reset({
        name: "",
        legal_name: "",
        tax_id: "",
        website: "",
        industry: "",
      });
    }
  }, [organization, isEditing, form]);

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
      if (isEditing && id) {
        await updateOrganization.mutateAsync({
          id,
          ...payload,
        });
        toast({ title: "Success", description: "Organization updated successfully" });
      } else {
        await createOrganization.mutateAsync({
          ...payload,
        });
        toast({ title: "Success", description: "Organization created successfully" });
      }
      navigate("/organizations");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const isPending = createOrganization.isPending || updateOrganization.isPending;

  if (isEditing && loadingOrganizations) {
    return (
      <DashboardLayout title={isEditing ? "Edit Organization" : "New Organization"}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={isEditing ? "Edit Organization" : "New Organization"}
      description={isEditing ? "Update organization details." : "Create a new organization."}
    >
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4 gap-2" 
          onClick={() => navigate("/organizations")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Button>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
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
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/organizations")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Update Organization" : "Create Organization"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrganizationForm;
