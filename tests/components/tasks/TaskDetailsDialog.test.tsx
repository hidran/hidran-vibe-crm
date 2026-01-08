import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskDetailsDialog from "@/components/tasks/TaskDetailsDialog";

const baseTask = {
  id: "task-1",
  organization_id: "org-1",
  project_id: "proj-1",
  assignee_id: null,
  title: "Prepare proposal",
  description: "Gather requirements and draft the proposal document.",
  status: "todo",
  priority: "high",
  position: 1,
  due_date: "2024-07-15",
  created_at: "2024-07-01T12:00:00Z",
  updated_at: "2024-07-05T08:00:00Z",
  project: {
    id: "proj-1",
    name: "Website Redesign",
  },
};

describe("TaskDetailsDialog", () => {
  it("renders task information when open", () => {
    render(
      <TaskDetailsDialog
        open
        onOpenChange={() => {}}
        task={baseTask as any}
      />,
    );

    expect(screen.getByText("Prepare proposal")).toBeInTheDocument();
    expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(
      screen.getByText("Gather requirements and draft the proposal document."),
    ).toBeInTheDocument();
  });

  it("shows placeholder message when no task selected", () => {
    render(<TaskDetailsDialog open onOpenChange={() => {}} task={null} />);

    expect(
      screen.getByText("Select a task to view its details."),
    ).toBeInTheDocument();
  });
});
