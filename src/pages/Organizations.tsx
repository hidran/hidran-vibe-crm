import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useOrganizations, useDeleteOrganization } from "@/hooks/useOrganizations";
import OrganizationDialog from "@/components/organizations/OrganizationDialog";
import OrganizationMembersDialog from "@/components/organizations/OrganizationMembersDialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search, Loader2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/data-table-pagination";

type Organization = Tables<"organizations">;

type SortField = "name" | "created_at";
type SortDirection = "asc" | "desc";
const LOAD_BATCH = 12;
const ROWS_PER_PAGE_OPTIONS = [10, 20, 30, 40, 50];

const formatWebsite = (website?: string | null) => {
  if (!website) return null;
  const trimmed = website.trim();
  if (!trimmed) return null;
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  return hasProtocol ? trimmed : `https://${trimmed}`;
};

const displayWebsite = (website?: string | null) => {
  if (!website) return "-";
  return website.replace(/^https?:\/\//i, "");
};

const Organizations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { data: isSuperadmin, isLoading: loadingSuperadmin } = useIsSuperadmin();
  const { 
    data: organizations = [], 
    isLoading: loadingOrganizations, 
    error: organizationsError,
    refetch: refetchOrganizations 
  } = useOrganizations(isSuperadmin ?? false);
  const deleteOrganization = useDeleteOrganization();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [visibleCount, setVisibleCount] = useState(LOAD_BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Filter organizations by search query
  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort organizations
  const sortedOrganizations = [...filteredOrganizations].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortField === "name") {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === "asc" ? comparison : -comparison;
    } else {
      const aDate = new Date(aValue).getTime();
      const bDate = new Date(bValue).getTime();
      return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
    }
  });

  const totalOrganizations = sortedOrganizations.length;
  const totalPages = totalOrganizations > 0 ? Math.ceil(totalOrganizations / rowsPerPage) : 1;
  const clampedPage = Math.min(currentPage, totalPages || 1);
  const pageStart = totalOrganizations === 0 ? 0 : (clampedPage - 1) * rowsPerPage;
  const paginatedOrganizations = sortedOrganizations.slice(pageStart, pageStart + rowsPerPage);
  const mobileOrganizations = sortedOrganizations.slice(0, visibleCount);

  useEffect(() => {
    if (clampedPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [clampedPage, totalPages]);

  useEffect(() => {
    setVisibleCount(LOAD_BATCH);
  }, [searchQuery, sortField, sortDirection, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    if (visibleCount >= totalOrganizations) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_BATCH, totalOrganizations));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, totalOrganizations, isMobile]);

  const handleEdit = (organization: Organization) => {
    navigate(`/organizations/${organization.id}/edit`);
  };

  const handleDelete = async () => {
    if (!organizationToDelete) return;

    try {
      await deleteOrganization.mutateAsync(organizationToDelete.id);
      toast({ 
        title: "Success",
        description: "Organization deleted successfully" 
      });
      setDeleteDialogOpen(false);
      setOrganizationToDelete(null);
    } catch (error: any) {
      console.error("Delete organization error:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete organization",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    }
  };

  const handleRetryLoad = () => {
    refetchOrganizations();
  };

  const handleViewMembers = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    setMembersDialogOpen(true);
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Skeleton className="h-5 w-48" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-40" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-16" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-8 w-8 rounded-full" />
        </TableCell>
      </TableRow>
    ));

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (loadingSuperadmin) {
    return (
      <DashboardLayout title="Organizations" description="Manage platform organizations.">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Organizations"
      description="Manage platform organizations."
      actions={
        <Button
          className="gap-2"
          onClick={() => navigate("/organizations/new")}
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {organizationsError ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-destructive rounded-lg bg-destructive/5">
            <p className="text-destructive font-medium mb-2">Failed to load organizations</p>
            <p className="text-muted-foreground text-sm mb-4">
              {(organizationsError as Error).message || "An unexpected error occurred"}
            </p>
            <Button onClick={handleRetryLoad} variant="outline">
              Retry
            </Button>
          </div>
        ) : loadingOrganizations ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Legal Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSkeletonRows()}
              </TableBody>
            </Table>
          </Card>
        ) : totalOrganizations === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No organizations match your search." : "No organizations yet."}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => navigate("/organizations/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first organization
              </Button>
            )}
          </div>
        ) : isMobile ? (
          /* Mobile Card View */
          <div className="space-y-4">
            {mobileOrganizations.map((org: any, index) => (
              <Card
                key={org.id}
                className="cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/organizations/${org.id}/edit`)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-medium">{org.name}</CardTitle>
                  </div>
                  {org.legal_name && (
                    <p className="text-sm text-muted-foreground">{org.legal_name}</p>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  {org.industry && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Industry:</span>
                      <span className="text-sm">{org.industry}</span>
                    </div>
                  )}
                  {org.website && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Website:</span>
                      <a
                        href={formatWebsite(org.website) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {displayWebsite(org.website)}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Created:</span>
                    <span className="text-sm">{format(new Date(org.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 mt-3">
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal text-primary hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewMembers(org.id);
                      }}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {org.member_count} {org.member_count === 1 ? "member" : "members"}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(org);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrganizationToDelete(org);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Desktop Table View */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("name")}
                  >
                    Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Legal Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("created_at")}
                  >
                    Created Date {sortField === "created_at" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrganizations.map((org: any, index) => (
                  <TableRow 
                    key={org.id}
                    className="animate-in fade-in-0 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.legal_name || "-"}</TableCell>
                    <TableCell>{org.industry || "-"}</TableCell>
                    <TableCell>
                      {org.website ? (
                        <a
                          href={formatWebsite(org.website) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {displayWebsite(org.website)}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(org.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-normal text-primary hover:underline"
                        onClick={() => handleViewMembers(org.id)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        {org.member_count}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit organization"
                          aria-label="Edit organization"
                          onClick={() => handleEdit(org)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          title="Delete organization"
                          aria-label="Delete organization"
                          onClick={() => {
                            setOrganizationToDelete(org);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-4 border-t">
              <PaginationControls
                currentPage={clampedPage}
                totalPages={totalPages}
                pageSize={rowsPerPage}
                totalCount={totalOrganizations}
                onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)))}
                onPageSizeChange={(size) => {
                  setRowsPerPage(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={ROWS_PER_PAGE_OPTIONS}
              />
            </div>
          </Card>
        )}
        {isMobile && visibleCount < totalOrganizations && (
          <div
            ref={sentinelRef}
            className="py-6 text-center text-sm text-muted-foreground"
          >
            Loading more organizations...
          </div>
        )}
      </div>

      <OrganizationMembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        organizationId={selectedOrganizationId}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{organizationToDelete?.name}"? This action cannot be
              undone and will delete all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrganization.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteOrganization.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteOrganization.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {deleteOrganization.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Organizations;
