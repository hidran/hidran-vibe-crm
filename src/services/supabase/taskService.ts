import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;
type TaskInsert = TablesInsert<"tasks">;
type TaskUpdate = TablesUpdate<"tasks">;

export type TaskStatus = Task["status"];

export interface TaskFilters {
  projectId?: string | null;
  clientId?: string | null;
}

export type TaskWithProject = Task & {
  project: { id: string; name: string; client_id?: string | null } | null;
};

class TaskService {
  async list(params: {
    organizationId?: string;
    isSuperadmin?: boolean;
    filters?: TaskFilters;
  }): Promise<TaskWithProject[]> {
    const { organizationId, isSuperadmin, filters } = params;

    if (!isSuperadmin && !organizationId) {
      return [];
    }

    let selectString = `
      id,
      organization_id,
      project_id,
      assignee_id,
      title,
      description,
      status,
      priority,
      position,
      due_date,
      created_at,
      updated_at,
      project:projects(id, name, client_id)
    `;

    if (filters?.clientId) {
      selectString = `
        id,
        organization_id,
        project_id,
        assignee_id,
        title,
        description,
        status,
        priority,
        position,
        due_date,
        created_at,
        updated_at,
        project:projects!inner(id, name, client_id)
      `;
    }

    let query = supabase
      .from("tasks")
      .select(selectString)
      .order("position")
      .order("created_at", { ascending: false });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (filters?.projectId) {
      query = query.eq("project_id", filters.projectId);
    }

    if (filters?.clientId) {
      query = query.eq("project.client_id", filters.clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase] fetch tasks failed", error);
      throw error;
    }

    return (data ?? []) as unknown as TaskWithProject[];
  }

  async getById(taskId?: string | null): Promise<TaskWithProject | null> {
    if (!taskId) {
      return null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
          id,
          organization_id,
          project_id,
          assignee_id,
          title,
          description,
          status,
          priority,
          position,
          due_date,
          created_at,
          updated_at,
          project:projects(id, name)
        `,
      )
      .eq("id", taskId)
      .single();

    if (error) {
      console.error("[Supabase] fetch task failed", error);
      throw error;
    }

    return data as TaskWithProject;
  }

  async create(task: TaskInsert): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error("[Supabase] create task failed", error);
      throw error;
    }

    return data as Task;
  }

  async update(payload: { id: string; updates: TaskUpdate }): Promise<Task> {
    const { id, updates } = payload;

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Supabase] update task failed", error);
      throw error;
    }

    return data as Task;
  }

  async updateStatus(payload: {
    id: string;
    status: TaskStatus;
    position?: number;
  }): Promise<Task> {
    const { id, status, position } = payload;
    const updates: TaskUpdate = { status };
    if (position !== undefined) {
      updates.position = position;
    }

    return this.update({ id, updates });
  }

  async remove(payload: {
    id: string;
    organizationId: string;
  }): Promise<{ id: string; organizationId: string }> {
    const { id, organizationId } = payload;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Supabase] delete task failed", error);
      throw error;
    }

    return { id, organizationId };
  }
}

export const taskService = new TaskService();

export type { Task, TaskInsert, TaskUpdate };