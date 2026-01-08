import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Attachment = Tables<"attachments">;

interface UseAttachmentsOptions {
  projectId?: string;
  taskId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch attachments for a project or task
 * Automatically filters by organization through RLS policies
 */
export const useAttachments = ({ projectId, taskId, enabled = true }: UseAttachmentsOptions) => {
  return useQuery({
    queryKey: ["attachments", { projectId, taskId }],
    queryFn: async () => {
      let query = supabase
        .from("attachments")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by project or task
      if (projectId) {
        query = query.eq("project_id", projectId);
      } else if (taskId) {
        query = query.eq("task_id", taskId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Attachment[];
    },
    enabled: enabled && (!!projectId || !!taskId),
  });
};

/**
 * Hook to upload an attachment
 */
export const useUploadAttachment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      organizationId,
      projectId,
      taskId,
      uploadedBy,
    }: {
      file: File;
      organizationId: string;
      projectId?: string;
      taskId?: string;
      uploadedBy: string;
    }) => {
      // Validate file size (10MB max)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File size must be under 10MB");
      }

      // Validate file type
      const allowedTypes = [
        // Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        // Images
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/svg+xml",
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "Unsupported file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF, SVG"
        );
      }

      // Generate storage path
      const entityType = projectId ? "projects" : "tasks";
      const entityId = projectId || taskId;

      // Generate unique filename if needed
      let fileName = file.name;
      const timestamp = Date.now();
      const nameParts = fileName.split(".");
      const extension = nameParts.pop();
      const baseName = nameParts.join(".");

      // Add timestamp to ensure uniqueness
      fileName = `${baseName}-${timestamp}.${extension}`;

      const storagePath = `${organizationId}/${entityType}/${entityId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data: attachment, error: dbError } = await supabase
        .from("attachments")
        .insert({
          organization_id: organizationId,
          project_id: projectId || null,
          task_id: taskId || null,
          file_url: uploadData.path,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: uploadedBy,
        })
        .select()
        .single();

      if (dbError) {
        // Rollback: delete uploaded file
        await supabase.storage.from("attachments").remove([storagePath]);
        throw dbError;
      }

      return attachment;
    },
    onSuccess: (_, variables) => {
      toast({ title: "File uploaded successfully" });
      queryClient.invalidateQueries({
        queryKey: ["attachments", { projectId: variables.projectId, taskId: variables.taskId }],
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    },
  });
};

/**
 * Hook to delete an attachment
 */
export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, fileUrl }: { id: string; fileUrl: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("attachments")
        .remove([fileUrl]);

      if (storageError) throw storageError;

      // Delete database record
      const { error: dbError } = await supabase
        .from("attachments")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      return { id };
    },
    onSuccess: () => {
      toast({ title: "Attachment deleted" });
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
    },
  });
};

/**
 * Hook to get a download URL for an attachment
 */
export const useDownloadAttachment = () => {
  return useMutation({
    mutationFn: async ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => {
      const { data, error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(fileUrl, 60); // 60 seconds expiry

      if (error) throw error;

      // Trigger download
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return data;
    },
  });
};