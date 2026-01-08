import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationMembers } from "@/hooks/useOrganizations";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface OrganizationMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

const OrganizationMembersDialog = ({
  open,
  onOpenChange,
  organizationId,
}: OrganizationMembersDialogProps) => {
  const { data: members, isLoading, error, refetch } = useOrganizationMembers(organizationId);

  const renderSkeletonRows = () => {
    return Array.from({ length: 3 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Skeleton className="h-5 w-48 mb-1" />
          <Skeleton className="h-4 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-20" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-28" />
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Organization Members</DialogTitle>
          <DialogDescription>
            View all members of this organization.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-destructive font-medium">Failed to load members</p>
              <p className="text-muted-foreground text-sm text-center">
                {(error as Error).message || "An unexpected error occurred"}
              </p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Join Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSkeletonRows()}
              </TableBody>
            </Table>
          ) : members && members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Join Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member, index) => (
                  <TableRow 
                    key={member.id}
                    className="animate-in fade-in-0 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{member.profile.email}</div>
                        {member.profile.full_name && (
                          <div className="text-sm text-muted-foreground">
                            {member.profile.full_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell>
                      {format(new Date(member.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No members found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationMembersDialog;
