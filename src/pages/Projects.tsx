import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useOrganization } from "@/hooks/useOrganization";
import { usePaginatedProjects, useDeleteProject } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Loader2, Building2, FolderKanban, CalendarIcon, X } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { PaginationControls } from "@/components/ui/data-table-pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDataList } from "@/components/ui/mobile-data-list";

type Project = Tables<"projects"> & { client?: { id: string; name: string } | null };

const statusColors: Record<string, string> = {
  planning: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];

const Projects = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization, isLoading: loadingOrg, createOrganization } = useOrganization();
  const { data: isSuperadmin, isLoading: loadingSuperadmin } = useIsSuperadmin();
  // Superadmins should see all projects, so pass undefined instead of organization?.id
  const deleteProject = useDeleteProject();
  const isMobile = useIsMobile();

  const { data: clients = [] } = useClients(isSuperadmin ? undefined : organization?.id);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  
  // Read filters from URL parameters
  const searchQuery = searchParams.get('search') || '';
  const clientFilter = searchParams.get('client') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const priorityFilter = searchParams.get('priority') || 'all';
  const startDateParam = searchParams.get('startDate');
  const dueDateParam = searchParams.get('dueDate');
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const rowsParam = parseInt(searchParams.get('rows') || String(ROWS_PER_PAGE_OPTIONS[0]), 10);
  const rowsPerPage = ROWS_PER_PAGE_OPTIONS.includes(rowsParam) ? rowsParam : ROWS_PER_PAGE_OPTIONS[0];
  
  const startDateFilter = startDateParam ? new Date(startDateParam) : undefined;
  const dueDateFilter = dueDateParam ? new Date(dueDateParam) : undefined;
  
  const filters = useMemo(() => ({
    search: searchQuery || undefined,
    clientId: clientFilter !== "all" ? clientFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    startDate: startDateFilter ? startDateFilter.toISOString().split('T')[0] : undefined,
    dueDate: dueDateFilter ? dueDateFilter.toISOString().split('T')[0] : undefined,
  }), [searchQuery, clientFilter, statusFilter, priorityFilter, startDateFilter, dueDateFilter]);

  const paginatedQuery = usePaginatedProjects({
    organizationId: isSuperadmin ? undefined : organization?.id,
    page: currentPage,
    pageSize: rowsPerPage,
    filters,
  });

  const { data: paginatedData, isLoading: loadingProjects } = paginatedQuery;
  const projects = paginatedData?.data ?? [];
  const totalProjects = paginatedData?.total ?? 0;
  const totalPages = totalProjects > 0 ? Math.ceil(totalProjects / rowsPerPage) : 1;

  useEffect(() => {
    if (totalProjects === 0) return;
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, totalProjects]);

  // Helper function to update URL parameters
  const updateUrlParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    
    setSearchParams(newParams, { replace: true });
  };

  // Update individual filters
  const setSearchQuery = (value: string) => updateUrlParams({ search: value, page: '1' });
  const setClientFilter = (value: string) => updateUrlParams({ client: value, page: '1' });
  const setStatusFilter = (value: string) => updateUrlParams({ status: value, page: '1' });
  const setPriorityFilter = (value: string) => updateUrlParams({ priority: value, page: '1' });
  const setStartDateFilter = (date: Date | undefined) => {
    updateUrlParams({ startDate: date ? date.toISOString().split('T')[0] : undefined, page: '1' });
  };
  const setDueDateFilter = (date: Date | undefined) => {
    updateUrlParams({ dueDate: date ? date.toISOString().split('T')[0] : undefined, page: '1' });
  };
  const setCurrentPage = (page: number) => updateUrlParams({ page: page.toString() });
  const setRowsPerPage = (value: number) => updateUrlParams({ rows: value.toString(), page: '1' });

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = 
    searchQuery !== "" || 
    clientFilter !== "all" || 
    statusFilter !== "all" || 
    priorityFilter !== "all" || 
    startDateFilter !== undefined || 
    dueDateFilter !== undefined;

  const handleEdit = (project: Project) => {
    navigate(`/projects/${project.id}/edit`);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;

    const organizationId = projectToDelete.organization_id || organization?.id;
    if (!organizationId) return;

    try {
      await deleteProject.mutateAsync({
        id: projectToDelete.id,
        organizationId,
      });
      toast({ title: "Project deleted successfully" });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

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
      <DashboardLayout title="Projects" description="Manage your projects and track progress.">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!organization && !isSuperadmin) {
    return (
      <DashboardLayout title="Projects" description="Manage your projects and track progress.">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Create Your Organization</CardTitle>
            <CardDescription>
              You need to create an organization before managing projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleCreateOrg} disabled={creatingOrg}>
              {creatingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Projects"
      description="Manage your projects and track progress."
      actions={
        <Button className="gap-2" onClick={() => navigate("/projects/new")}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDateFilter ? format(startDateFilter, "PPP") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateFilter}
                  onSelect={setStartDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDateFilter ? format(dueDateFilter, "PPP") : "Due Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDateFilter}
                  onSelect={setDueDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {loadingProjects ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : totalProjects === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No projects match your search." : "No projects yet."}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate("/projects/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first project
              </Button>
            )}
          </div>
        ) : isMobile ? (
          <div className="space-y-4">
            <MobileDataList
              data={projects}
              isLoading={loadingProjects}
              renderItem={(project) => (
                <Card key={project.id} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/tasks?project=${project.id}`)}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base font-medium leading-tight">{project.name}</CardTitle>
                      <Badge variant="secondary" className={`shrink-0 ${statusColors[project.status]}`}>
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{project.client?.name || "No Client"}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex justify-between items-center text-sm mb-3">
                      <Badge variant="outline" className={`text-xs ${priorityColors[project.priority]}`}>
                        {project.priority}
                      </Badge>
                      <div className="flex items-center text-muted-foreground text-xs">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {project.due_date ? format(new Date(project.due_date), "MMM d") : "-"}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(project);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            />
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={rowsPerPage}
              totalCount={totalProjects}
              onPageChange={setCurrentPage}
              onPageSizeChange={setRowsPerPage}
              pageSizeOptions={ROWS_PER_PAGE_OPTIONS}
            />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Client</TableHead>
                  <TableHead className="w-[140px] text-center whitespace-nowrap">Status</TableHead>
                  <TableHead className="w-[140px] text-center whitespace-nowrap">Priority</TableHead>
                  <TableHead className="whitespace-nowrap">Due Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="cursor-pointer" onClick={() => navigate(`/tasks?project=${project.id}`)}>
                    <TableCell className="font-medium whitespace-nowrap">{project.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{project.client?.name || "-"}</TableCell>
                    <TableCell className="w-[140px]">
                      <div className="inline-flex w-full justify-center">
                        <Badge
                          variant="secondary"
                          className={`w-full justify-center ${statusColors[project.status]}`}
                        >
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="w-[140px]">
                      <div className="inline-flex w-full justify-center">
                        <Badge
                          variant="secondary"
                          className={`w-full justify-center ${priorityColors[project.priority]}`}
                        >
                          {project.priority}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {project.due_date ? format(new Date(project.due_date), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(project);
                          }}
                          aria-label={`Edit ${project.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project);
                            setDeleteDialogOpen(true);
                          }}
                          aria-label={`Delete ${project.name}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Reused Pagination Controls */}
            <div className="px-4 py-4 border-t">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={rowsPerPage}
                totalCount={totalProjects}
                onPageChange={setCurrentPage}
                onPageSizeChange={setRowsPerPage}
                pageSizeOptions={ROWS_PER_PAGE_OPTIONS}
              />
            </div>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Projects;