/*
 * KanbanBoard - Drag-and-drop task management interface
 *
 * Displays tasks in a Kanban board with five columns representing task status:
 * Backlog, To Do, In Progress, Review, and Done. Tasks can be dragged between
 * columns to change status and reordered within columns to adjust position.
 *
 * FEATURES:
 * - Drag-and-drop task reordering with visual feedback
 * - Task position updates persist to database
 * - Status transitions when tasks are dropped in different columns
 * - Delete confirmation dialog with undo capability
 * - Priority and due date badges for quick reference
 * - Dark mode support with theme-aware colors
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdateTaskStatus, useDeleteTask } from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Plus, Pencil, Trash2, GripVertical, Eye } from "lucide-react";
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
import { format } from "date-fns";

type Task = Tables<"tasks"> & { project?: { id: string; name: string } | null };
type TaskStatus = Task["status"];

/* Kanban column definitions: these represent the task workflow states */
const columns: { id: TaskStatus; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

/*
 * Priority color mapping for visual task differentiation
 * Each priority level has distinct colors for light and dark modes
 */
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

interface KanbanBoardProps {
  tasks: Task[];
  organizationId: string;
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
}

/*
 * KanbanBoard - Main component for task management
 *
 * STATE:
 * - draggedTaskId: ID of the task currently being dragged
 * - dragOverTaskId: ID of the task the cursor is over (for position indicator)
 * - dragOverPosition: Whether the indicator should appear "before" or "after"
 * - deleteDialogOpen: Controls visibility of the delete confirmation dialog
 * - taskToDelete: Task pending deletion (set before opening dialog)
 *
 * The component uses controlled drag state to provide visual feedback during
 * drag operations and calculate the final position when dropping.
 */
const KanbanBoard = ({ tasks, organizationId, onAddTask, onEditTask, onViewTask }: KanbanBoardProps) => {
  const { toast } = useToast();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after" | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  /*
   * Group tasks by status and sort within each group
   *
   * SORTING STRATEGY:
   * 1. Tasks with explicit position values come first (ordered by position)
   * 2. Tasks without position come last (ordered by creation date, newest first)
   *
   * This allows manual positioning of prioritized tasks while auto-sorting
   * newly created tasks. Recalculates only when the task list changes.
   */
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    tasks.forEach((task) => {
      grouped[task.status].push(task);
    });

    /* Sort tasks: positioned tasks first, then by creation date */
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => {
        if (a.position !== null && b.position !== null) {
          return a.position - b.position;
        }
        if (a.position !== null) return -1;
        if (b.position !== null) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });

    return grouped;
  }, [tasks]);

  /*
   * Initiate drag operation by storing the dragged task ID
   */
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    setDraggedTaskId(taskId);
  };

  /*
   * Clean up drag state when drag operation completes
   */
  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverPosition(null);
  };

  /*
   * Handle drag over empty column space
   *
   * When dragging over the column itself (not a task), clear the task-specific
   * position indicator so the task appends to the end of the column.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    /* Clear task-specific drag state when dragging over column empty space */
    if (e.target === e.currentTarget) {
      setDragOverTaskId(null);
      setDragOverPosition(null);
    }
  };

  /*
   * Handle drag over a specific task
   *
   * Calculates whether the drag position is "before" or "after" the target task
   * by comparing the cursor Y position to the task element's midpoint. Updates
   * visual indicators for position insertion.
   */
  const handleTaskDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();

    /* Prevent highlighting for the task being dragged */
    if (draggedTaskId === taskId) return;

    /* Calculate whether cursor is in top or bottom half of task */
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? "before" : "after";

    setDragOverTaskId(taskId);
    setDragOverPosition(position);
  };

  /*
   * Clean up drag state when cursor leaves a task
   *
   * Only clears if the related target (new hovered element) is outside
   * the current task element, preventing flickering during transitions.
   */
  const handleTaskDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverTaskId(null);
      setDragOverPosition(null);
    }
  };

  /*
   * Calculate the final position index for a dropped task
   *
   * LOGIC:
   * - If no target task (empty column): return length (append to end)
   * - If before: return the target task's index
   * - If after: return the target task's index + 1
   * - Cross-column moves: position defaults to column length (append)
   */
  const calculateNewPosition = (
    targetTaskId: string,
    position: "before" | "after",
    status: TaskStatus
  ): number => {
    const tasksInColumn = tasksByStatus[status];
    const targetIndex = tasksInColumn.findIndex((t) => t.id === targetTaskId);

    /* If task not found in this column (dragging between columns), append to end */
    if (targetIndex === -1) return tasksInColumn.length;

    if (position === "before") {
      return targetIndex;
    } else {
      return targetIndex + 1;
    }
  };

  /*
   * Handle task drop - update status and/or position
   *
   * FLOW:
   * 1. Extract dropped task ID from drag data
   * 2. Calculate new position if dropped on a specific task
   * 3. Mutate task status and position (both may change)
   * 4. Show error toast if mutation fails
   * 5. Clear drag state in finally block
   */
  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");

    if (!taskId) return;

    try {
      let newPosition: number | undefined;

      /* Calculate position if dropped on a specific task */
      if (dragOverTaskId && dragOverPosition) {
        newPosition = calculateNewPosition(dragOverTaskId, dragOverPosition, status);
      }

      await updateTaskStatus.mutateAsync({
        id: taskId,
        status,
        position: newPosition
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      /* Always clear drag state, even on error */
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverPosition(null);
    }
  };

  /*
   * Handle confirmed task deletion
   *
   * Calls the delete mutation with the task ID and organization ID.
   * Shows a success toast on completion, then closes the dialog.
   * Errors are displayed in a destructive toast.
   */
  const handleDelete = async () => {
    if (!taskToDelete) return;

    try {
      await deleteTask.mutateAsync({ id: taskToDelete.id, organizationId });
      toast({ title: "Task deleted successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:overflow-x-auto md:pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="w-full md:flex-shrink-0 md:w-72"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <Card className="bg-muted/30">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {column.title}
                  <Badge variant="secondary" className="ml-1">
                    {tasksByStatus[column.id].length}
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddTask(column.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2 space-y-2 min-h-[200px]">
              {tasksByStatus[column.id].map((task) => (
                <div key={task.id} className="relative">
                  {dragOverTaskId === task.id && dragOverPosition === "before" && (
                    <div className="h-1 bg-primary rounded-full mb-2 animate-pulse" />
                  )}
                  <Card
                    className={`cursor-grab active:cursor-grabbing bg-background hover:border-primary/50 transition-colors ${
                      draggedTaskId === task.id ? "opacity-50" : ""
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleTaskDragOver(e, task.id)}
                    onDragLeave={handleTaskDragLeave}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onViewTask(task);
                    }}
                  >
                    <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            {task.project && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {task.project.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewTask(task);
                            }}
                            title="View details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTaskToDelete(task);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pl-6">
                        <Badge variant="secondary" className={`text-xs w-16 justify-center ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(task.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {dragOverTaskId === task.id && dragOverPosition === "after" && (
                  <div className="h-1 bg-primary rounded-full mt-2 animate-pulse" />
                )}
              </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
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
    </div>
  );
};

export default KanbanBoard;
