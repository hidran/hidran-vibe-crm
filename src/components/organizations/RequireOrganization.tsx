import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2 } from "lucide-react";

interface RequireOrganizationProps {
  children: React.ReactNode;
}

const RequireOrganization = ({ children }: RequireOrganizationProps) => {
  const { organization, isLoading: loadingOrg, createOrganization } = useOrganization();
  const { data: isSuperadmin, isLoading: loadingSuperadmin } = useIsSuperadmin();
  const { toast } = useToast();
  const [creatingOrg, setCreatingOrg] = useState(false);

  const handleCreateOrg = async () => {
    setCreatingOrg(true);
    try {
      await createOrganization.mutateAsync({
        name: "My Organization",
        slug: `org-${Date.now()}`,
      });
      toast({ title: "Organization created successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setCreatingOrg(false);
    }
  };

  if (loadingOrg || loadingSuperadmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!organization && !isSuperadmin) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle>Create Your Organization</CardTitle>
          <CardDescription>
            You need to create an organization before accessing this section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleCreateOrg} disabled={creatingOrg}>
            {creatingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Organization
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

export default RequireOrganization;
