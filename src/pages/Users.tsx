import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { UsersDataTable } from "@/components/users/UsersDataTable";
import { useUsers } from "@/hooks/useUsers";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { Plus, Loader2, User as UserIcon, Building2, Edit, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDataList } from "@/components/ui/mobile-data-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Users = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization } = useOrganization();
  const { data: isSuperadmin } = useIsSuperadmin();
  const { data: organizations = [] } = useOrganizations(!!isSuperadmin);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // Get organization filter from URL or default based on user type
  const orgFilter = searchParams.get("org") || "";

  // Determine which org ID to use for the query
  // Superadmin: use orgFilter (empty = all users, specific ID = filtered)
  // Org admin: always use their organization
  const queryOrgId = isSuperadmin
    ? (orgFilter || undefined)  // undefined = all users
    : organization?.id;

  const isGlobalView = isSuperadmin && !orgFilter;

  const { data: users = [], isLoading } = useUsers(queryOrgId);

  const handleOrgFilter = (value: string) => {
    if (value === "all") {
      searchParams.delete("org");
    } else {
      searchParams.set("org", value);
    }
    setSearchParams(searchParams);
  };

  const handleDelete = async () => {
    if (!userToDelete || !userToDelete.id) return;

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", userToDelete.id);

      if (error) throw error;

      toast({ title: "User removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error removing user",
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <DashboardLayout
      title={isGlobalView ? "All Users" : "Users"}
      description={isGlobalView ? "View and manage all users across all organizations." : "Manage organization members and their roles."}
      actions={
        <div className="flex items-center gap-4">
          {isSuperadmin && (
            <Select value={orgFilter || "all"} onValueChange={handleOrgFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.filter(o => !!o.id).map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button className="gap-2" onClick={() => navigate("/users/new")}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg">
          <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No users yet.</p>
          <Button onClick={() => navigate("/users/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first user
          </Button>
        </div>
      ) : isMobile ? (
        <>
          <MobileDataList
            data={users}
            isLoading={isLoading}
            renderItem={(user) => (
              <Card key={user.id} className="cursor-pointer active:scale-[0.98] transition-transform">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-medium leading-tight">{user.full_name || "N/A"}</CardTitle>
                    <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                  </div>
                  <CardDescription className="text-xs break-all">{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {isGlobalView && (
                    <div className="flex items-center text-muted-foreground text-xs mb-3">
                      <Building2 className="mr-1 h-3 w-3" />
                      {user.organization_name || "No Organization"}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 border-t pt-3">
                    <Button variant="ghost" size="sm" className="h-11" onClick={() => navigate(`/users/${user.id}/edit`)} disabled={!user.id}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-11 text-destructive hover:text-destructive" onClick={() => { setUserToDelete(user); setDeleteDialogOpen(true); }} disabled={!user.id}>Remove</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          />
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Remove User</AlertDialogTitle>
                 <AlertDialogDescription>Are you sure you want to remove this user from the organization? This action cannot be undone.</AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <UsersDataTable
          users={users}
          isGlobalView={isGlobalView}
          organizationId={queryOrgId}
        />
      )}
    </DashboardLayout>
  );
};

export default Users;
