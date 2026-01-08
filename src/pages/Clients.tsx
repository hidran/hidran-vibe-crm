import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ClientsDataTable } from "@/components/clients/ClientsDataTable";
import { useOrganization } from "@/hooks/useOrganization";
import { useClients, useDeleteClient } from "@/hooks/useClients";
import { useOrganizations } from "@/hooks/useOrganizations";
import RequireOrganization from "@/components/organizations/RequireOrganization";
import { Plus, Loader2, Edit, Trash2, Building2 } from "lucide-react";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDataList } from "@/components/ui/mobile-data-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  prospect: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  prospect: "Prospect",
};

const Clients = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { data: isSuperadmin } = useIsSuperadmin();
  const { data: organizations = [] } = useOrganizations(!!isSuperadmin);
  const { data: clients = [], isLoading: loadingClients } = useClients(organization?.id);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const deleteClient = useDeleteClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);

  // Create a map of organization IDs to names for quick lookup
  const orgNameMap = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations]
  );

  const handleDelete = async () => {
    if (!clientToDelete) return;

    try {
      await deleteClient.mutateAsync({
        id: clientToDelete.id,
        organizationId: organization?.id || "",
      });
      toast({ title: "Client deleted successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  return (
    <DashboardLayout
      title="Clients"
      description="Manage your client relationships."
      actions={
        <Button className="gap-2" onClick={() => navigate("/clients/new")}>
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      }
    >
      <RequireOrganization>
        {loadingClients ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-4">No clients yet.</p>
            <Button onClick={() => navigate("/clients/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first client
            </Button>
          </div>
        ) : isMobile ? (
          <>
            <MobileDataList
              data={clients}
              isLoading={loadingClients}
              renderItem={(client) => (
                <Card key={client.id} className="cursor-pointer active:scale-[0.98] transition-transform">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base font-medium leading-tight">{client.name}</CardTitle>
                      <Badge variant="secondary" className={`${statusColors[client.status]} shrink-0`}>
                        {statusLabels[client.status]}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{client.email || "No Email"}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="text-sm text-muted-foreground mb-2">
                      {client.phone || "No Phone"}
                    </div>
                    {!!isSuperadmin && (
                      <div className="flex items-center text-muted-foreground text-xs mb-3">
                        <Building2 className="mr-1 h-3 w-3" />
                        {orgNameMap.get(client.organization_id) || "Unknown Org"}
                      </div>
                    )}
                    <div className="flex justify-end gap-2 border-t pt-3">
                      <Button variant="ghost" size="sm" className="h-11" onClick={() => navigate(`/clients/${client.id}/edit`)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="h-11 text-destructive hover:text-destructive" onClick={() => { setClientToDelete(client); setDeleteDialogOpen(true); }}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            />
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Client</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{clientToDelete?.name}"? This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <ClientsDataTable
            clients={clients}
            organizationId={organization?.id || ""}
            orgNameMap={orgNameMap}
            showOrgColumn={!!isSuperadmin}
          />
        )}
      </RequireOrganization>
    </DashboardLayout>
  );
};

export default Clients;
