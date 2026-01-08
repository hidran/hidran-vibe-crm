import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const userSchema = z.object({
  email: z.string().email("Invalid email"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(["owner", "admin", "member"]),
  organization_id: z.string().optional(),
});

interface UserFormData {
  email: string;
  first_name?: string;
  last_name?: string;
  role: "owner" | "admin" | "member";
  organization_id?: string;
}

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { data: isSuperadmin } = useIsSuperadmin();
  const { data: organizations = [] } = useOrganizations(!!isSuperadmin);
  const [isPending, setIsPending] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(organization?.id);
  const [orgComboboxOpen, setOrgComboboxOpen] = useState(false);

  const isEditing = !!id;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      role: "member",
      organization_id: organization?.id || "",
    },
  });

  // Fetch member details if editing
  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id,
          role,
          user_id,
          organization_id
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Check permissions: non-superadmin can only edit users from their own org
      if (!isSuperadmin && organization?.id && data.organization_id !== organization.id) {
        throw new Error("You don't have permission to edit this user");
      }

      // Fetch profile data (first_name, last_name)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", data.user_id)
        .single();

      if (profileError) throw profileError;

      // Fetch email from auth.users using the RPC function
      const { data: usersData, error: usersError } = await supabase.rpc(
        "get_organization_members",
        { _org_id: data.organization_id }
      );

      if (usersError) throw usersError;

      const userData = usersData?.find((u: any) => u.user_id === data.user_id);

      return {
        ...data,
        first_name: profileData?.first_name || "",
        last_name: profileData?.last_name || "",
        email: userData?.email || "",
      };
    },
    enabled: isEditing && isSuperadmin !== undefined,
  });

  // Set default org when organization loads
  useEffect(() => {
    if (organization?.id && !selectedOrgId && !isEditing) {
      setSelectedOrgId(organization.id);
      form.setValue("organization_id", organization.id);
    }
  }, [organization?.id, selectedOrgId, isEditing, form]);

  useEffect(() => {
    if (member) {
      form.reset({
        email: member.email || "",
        first_name: member.first_name || "",
        last_name: member.last_name || "",
        role: member.role as "owner" | "admin" | "member",
        organization_id: member.organization_id,
      });
      setSelectedOrgId(member.organization_id);
    }
  }, [member, form]);

  const onSubmit = async (data: UserFormData) => {
    const targetOrgId = isSuperadmin ? selectedOrgId : organization?.id;

    if (!targetOrgId && !isEditing) {
      toast({ variant: "destructive", title: "Please select an organization" });
      return;
    }

    setIsPending(true);
    try {
      if (isEditing && !member) {
        throw new Error("User details are still loading. Please try again in a moment.");
      }

      if (isEditing) {
        // Check if organization is being changed (superadmin only)
        const isOrgChanging = isSuperadmin && member && selectedOrgId !== member.organization_id;

        if (isOrgChanging) {
          // Need to delete old membership and create new one in different org
          const { error: deleteError } = await supabase
            .from("organization_members")
            .delete()
            .eq("id", id);

          if (deleteError) throw deleteError;

          const { error: insertError } = await supabase
            .from("organization_members")
            .insert({
              organization_id: selectedOrgId!,
              user_id: member!.user_id,
              role: data.role,
            });

          if (insertError) throw insertError;
          toast({ title: "User organization and role updated successfully" });
        } else {
          // Just update the role
          const { error } = await supabase
            .from("organization_members")
            .update({ role: data.role })
            .eq("id", id);

          if (error) throw error;
          toast({ title: "User role updated successfully" });
        }

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            first_name: data.first_name || null,
            last_name: data.last_name || null,
          })
          .eq("id", member!.user_id);

        if (profileUpdateError) throw profileUpdateError;

        navigate("/users");
      } else {
        // Create new user using the invite_user_to_organization function
        const { data: userId, error: inviteError } = await supabase.rpc(
          "invite_user_to_organization",
          {
            _email: data.email,
            _org_id: targetOrgId!,
            _role: data.role,
            _first_name: data.first_name || null,
            _last_name: data.last_name || null,
          } as any
        );

        if (inviteError) {
          // Check for specific error messages
          if (inviteError.message.includes("already a member")) {
            throw new Error("User is already a member of this organization.");
          } else if (inviteError.message.includes("Permission denied")) {
            throw new Error("You don't have permission to invite users to this organization.");
          }
          throw inviteError;
        }

        toast({
          title: "User invited successfully",
          description: "The user has been added to the organization. They will need to reset their password to log in.",
        });
        navigate("/users");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsPending(false);
    }
  };

  if (isEditing && isLoadingMember) {
      return (
          <DashboardLayout title="Loading..." description="Please wait">
              <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
          </DashboardLayout>
      );
  }

  return (
    <DashboardLayout 
      title={isEditing ? "Edit User role" : "Add User"}
      description={isEditing ? "Update user role." : "Add a new user to your organization."}
    >
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4 gap-2" 
          onClick={() => navigate("/users")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isSuperadmin && (
                <FormItem>
                  <FormLabel>Organization *</FormLabel>
                  <Popover open={orgComboboxOpen} onOpenChange={setOrgComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={orgComboboxOpen}
                        className="w-full justify-between"
                      >
                        {selectedOrgId
                          ? organizations.find((org) => org.id === selectedOrgId)?.name
                          : "Select organization..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-popover" align="start">
                      <Command>
                        <CommandInput placeholder="Search organization..." />
                        <CommandList>
                          <CommandEmpty>No organization found.</CommandEmpty>
                          <CommandGroup>
                            {organizations.map((org) => (
                              <CommandItem
                                key={org.id}
                                value={org.name}
                                onSelect={() => {
                                  setSelectedOrgId(org.id);
                                  form.setValue("organization_id", org.id);
                                  setOrgComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedOrgId === org.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {org.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Changing the organization will move this user to a different organization.
                    </p>
                  )}
                </FormItem>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="user@example.com"
                        {...field}
                        disabled={isEditing}
                      />
                    </FormControl>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed here.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/users")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Update User" : "Add User"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserForm;
