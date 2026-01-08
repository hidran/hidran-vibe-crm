import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Building2, Loader2, Table2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import KanbanBoard from "@/components/tasks/KanbanBoard";
import TaskDetailsDialog from "@/components/tasks/TaskDetailsDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useOrganization } from "@/hooks/useOrganization";
import { useTasks, TaskStatus } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks"> & { project?: { id: string; name: string } | null };

const TasksBoard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const projectFilter = searchParams.get("project") || "";
  const clientFilter = searchParams.get("client") || "";
  const { organization, isLoading: loadingOrg, createOrganization } = useOrganization();
  const { data: isSuperadmin, isLoading: loadingSuperadmin } = useIsSuperadmin();

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

  const tableUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (projectFilter) params.set("project", projectFilter);
    if (clientFilter) params.set("client", clientFilter);
    const query = params.toString();
    return `/tasks${query ? `?${query}` : ""}`;
  }, [projectFilter, clientFilter]);

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
      <DashboardLayout title="Task Board" description="Plan and update tasks visually.">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!organization && !isSuperadmin) {
    return (
      <DashboardLayout title="Task Board" description="Plan and update tasks visually.">
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
      title="Task Board"
      description="Plan and update tasks visually."
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
          <Button variant="outline" className="gap-2 w-full sm:w-auto" asChild>
            <Link to={tableUrl}>
              <Table2 className="h-4 w-4" />
              View Table
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
      ) : (
        <KanbanBoard
          tasks={tasks}
          organizationId={organization?.id || ""}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
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

export default TasksBoard;
