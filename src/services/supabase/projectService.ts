import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type ProjectInsert = TablesInsert<"projects">;
type ProjectUpdate = TablesUpdate<"projects"> & { id?: string };

export interface ProjectFilters {
  search?: string;
  clientId?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  dueDate?: string;
}

export interface ProjectListParams {
  organizationId?: string;
  isSuperadmin?: boolean;
  filters?: ProjectFilters;
  pagination?: {
    page: number;
    pageSize: number;
  };
}

export type ProjectWithClient = Project & {
  client: { id: string; name: string } | null;
};

class ProjectService {
  async list(params: ProjectListParams): Promise<{ data: ProjectWithClient[]; total: number }> {
    const { organizationId, isSuperadmin, filters, pagination } = params;

    if (!isSuperadmin && !organizationId) {
      return { data: [], total: 0 };
    }

    let query = supabase
      .from("projects")
      .select(
        `
          id,
          organization_id,
          client_id,
          name,
          description,
          status,
          priority,
          budget,
          start_date,
          due_date,
          created_at,
          updated_at,
          client:clients(id, name)
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (filters?.clientId) {
      query = query.eq("client_id", filters.clientId);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status as any);
    }

    if (filters?.priority) {
      query = query.eq("priority", filters.priority as any);
    }

    if (filters?.startDate) {
      query = query.gte("start_date", filters.startDate);
    }

    if (filters?.dueDate) {
      query = query.lte("due_date", filters.dueDate);
    }

    if (filters?.search?.trim()) {
      const pattern = `%${filters.search.trim()}%`;
      query = query.or(`name.ilike.${pattern},description.ilike.${pattern}`);
    }

    if (pagination) {
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Supabase] fetch projects failed", error);
      throw error;
    }

    return {
      data: (data ?? []) as ProjectWithClient[],
      total: count ?? (data?.length ?? 0),
    };
  }

  async getById(projectId?: string | null): Promise<ProjectWithClient | null> {
    if (!projectId) {
      return null;
    }

    const { data, error } = await supabase
      .from("projects")
      .select(
        `
          id,
          organization_id,
          client_id,
          name,
          description,
          status,
          priority,
          budget,
          start_date,
          due_date,
          created_at,
          updated_at,
          client:clients(id, name)
        `,
      )
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("[Supabase] fetch project failed", error);
      throw error;
    }

    return data as ProjectWithClient;
  }

  async create(project: ProjectInsert): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .insert(project)
      .select()
      .single();

    if (error) {
      console.error("[Supabase] create project failed", error);
      throw error;
    }

    return data as Project;
  }

  async update(payload: { id: string; updates: ProjectUpdate }): Promise<Project> {
    const { id, updates } = payload;

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Supabase] update project failed", error);
      throw error;
    }

    return data as Project;
  }

  async remove(payload: { id: string; organizationId: string }): Promise<{ id: string; organizationId: string }> {
    const { id, organizationId } = payload;

    await this.deleteAttachmentFilesForProject(id);

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Supabase] delete project failed", error);
      throw error;
    }

    return { id, organizationId };
  }

  private async deleteAttachmentFilesForProject(projectId: string): Promise<void> {
    const attachments: string[] = [];

    const { data: projectAttachments, error: projectAttachmentError } = await supabase
      .from("attachments")
      .select("file_url")
      .eq("project_id", projectId);

    if (projectAttachmentError) {
      console.error("[Supabase] fetch project attachments failed", projectAttachmentError);
      throw projectAttachmentError;
    }

    projectAttachments?.forEach((attachment) => {
      if (attachment.file_url) {
        attachments.push(attachment.file_url);
      }
    });

    const { data: taskIds, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("project_id", projectId);

    if (taskError) {
      console.error("[Supabase] fetch project tasks failed", taskError);
      throw taskError;
    }

    if (taskIds && taskIds.length > 0) {
      const taskIdList = taskIds.map((task) => task.id);
      const { data: taskAttachments, error: taskAttachmentsError } = await supabase
        .from("attachments")
        .select("file_url")
        .in("task_id", taskIdList);

      if (taskAttachmentsError) {
        console.error("[Supabase] fetch task attachments failed", taskAttachmentsError);
        throw taskAttachmentsError;
      }

      taskAttachments?.forEach((attachment) => {
        if (attachment.file_url) {
          attachments.push(attachment.file_url);
        }
      });
    }

    if (attachments.length > 0) {
      const { error: storageError } = await supabase.storage.from("attachments").remove(attachments);
      if (storageError) {
        console.error("[Supabase] remove attachment files failed", storageError);
        throw storageError;
      }
    }
  }
}

export const projectService = new ProjectService();

export type { Project, ProjectInsert, ProjectUpdate };