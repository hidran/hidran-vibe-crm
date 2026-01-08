import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Task = Tables<"tasks"> & {
  project?: { id: string; name: string } | null;
};

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TaskDetailsDialog = ({ open, onOpenChange, task }: TaskDetailsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>View task metadata and description.</DialogDescription>
        </DialogHeader>

        {task ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Title</p>
              <p className="font-semibold text-lg">{task.title}</p>
            </div>

            {task.project && (
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-medium">{task.project.name}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge variant="secondary" className="w-full justify-center">
                  {statusLabels[task.status] ?? task.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Priority</p>
                <Badge variant="outline" className="w-full justify-center">
                  {priorityLabels[task.priority] ?? task.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">
                  {task.due_date ? format(new Date(task.due_date), "PP") : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(task.created_at), "PPp")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="font-medium">
                  {format(new Date(task.updated_at), "PPp")}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              {task.description ? (
                <p className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-line">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a task to view its details.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsDialog;
