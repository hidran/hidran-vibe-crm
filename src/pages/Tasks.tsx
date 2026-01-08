import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Building2, Loader2, LayoutGrid, CalendarIcon } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useOrganization } from "@/hooks/useOrganization";
import { useTasks, TaskStatus } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDataList } from "@/components/ui/mobile-data-list";
import { TasksDataTable } from "@/components/tasks/TasksDataTable";
import TaskDetailsDialog from "@/components/tasks/TaskDetailsDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";

type Task = Tables<"tasks"> & { project?: { id: string; name: string } | null };

const statusColors: Record<string, string> = {
  backlog: "bg-gray-500",
  todo: "bg-blue-500",
  in_progress: "bg-yellow-500",
  review: "bg-purple-500",
  done: "bg-green-500",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const Tasks = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const projectFilter = searchParams.get("project") || "";
  const clientFilter = searchParams.get("client") || "";

  const { organization, isLoading: loadingOrg, createOrganization } = useOrganization();
  const { data: isSuperadmin, isLoading: loadingSuperadmin } = useIsSuperadmin();

  // Memoize filters to prevent unnecessary re-renders and duplicate queries
  const taskFilters = useMemo(
    () => ({
      projectId: projectFilter || null,
      clientId: clientFilter || null,
    }),
    [projectFilter, clientFilter]
  );

  const { data: tasks = [], isLoading: loadingTasks } = useTasks(
    organization?.id,
    taskFilters
  );
  
  const { data: projects = [] } = useProjects(organization?.id);
  const { data: clients = [] } = useClients(organization?.id);

  const [creatingOrg, setCreatingOrg] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleAddTask = (status: TaskStatus) => {
    const params = new URLSearchParams();
    params.set("status", status);
    if (projectFilter) params.set("project", projectFilter);
    navigate(`/tasks/new?${params.toString()}`);
  };

  const handleEditTask = (task: Task) => {
    navigate(`/tasks/${task.id}/edit`);
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const handleProjectFilter = (value: string) => {
    if (value === "all") {
      searchParams.delete("project");
    } else {
      searchParams.set("project", value);
    }
    setSearchParams(searchParams);
  };

  const handleClientFilter = (value: string) => {
    if (value === "all") {
      searchParams.delete("client");
    } else {
      searchParams.set("client", value);
    }
    setSearchParams(searchParams);
  };

  const boardUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (projectFilter) params.set("project", projectFilter);
    if (clientFilter) params.set("client", clientFilter);
    const query = params.toString();
    return `/tasks/board${query ? `?${query}` : ""}`;
  }, [projectFilter, clientFilter]);

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
      <DashboardLayout title="Tasks" description="View and manage all your tasks.">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!organization && !isSuperadmin) {
    return (
      <DashboardLayout title="Tasks" description="View and manage all your tasks.">
        <div className="max-w-2xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle>Welcome to Vibe CRM</CardTitle>
              <CardDescription>
                To start managing tasks, you first need to create your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleCreateOrg} 
                className="w-full"
                disabled={creatingOrg}
              >
                {creatingOrg ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  "Create Your Organization"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Tasks"
      description="View and manage all your tasks."
      actions={
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={clientFilter || "all"} onValueChange={handleClientFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.filter((c) => !!c.id).map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter || "all"} onValueChange={handleProjectFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.filter((p) => !!p.id).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            asChild
          >
            <Link to={boardUrl}>
              <LayoutGrid className="h-4 w-4" />
              View Board
            </Link>
          </Button>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => handleAddTask("backlog")}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      }
    >
      {loadingTasks ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-4">No tasks yet.</p>
          <Button onClick={() => handleAddTask("backlog")}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first task
          </Button>
        </div>
      ) : isMobile ? (
        <MobileDataList
          data={tasks}
          isLoading={loadingTasks}
          renderItem={(task) => (
            <Card key={task.id} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleViewTask(task)}>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base font-medium leading-tight">{task.title}</CardTitle>
                  <Badge className={`shrink-0 ${statusColors[task.status]}`}>
                    {task.status.replace("_", " ")}
                  </Badge>
                </div>
                {task.project && <CardDescription className="text-xs">{task.project.name}</CardDescription>}
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex justify-between items-center text-sm mb-3">
                  <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </Badge>
                  <div className="flex items-center text-muted-foreground text-xs">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {task.due_date ? format(new Date(task.due_date), "MMM d") : "-"}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTask(task);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        />
      ) : (
        <TasksDataTable
          tasks={tasks}
          organizationId={organization?.id || ""}
          onViewTask={handleViewTask}
        />
      )}
      <TaskDetailsDialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedTask(null);
          }
        }}
        task={selectedTask}
      />
    </DashboardLayout>
  );
};

export default Tasks;
