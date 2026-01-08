import { FileUploadZone } from "./FileUploadZone";
import { AttachmentList } from "./AttachmentList";
import {
  useAttachments,
  useDeleteAttachment,
  useDownloadAttachment,
} from "@/hooks/useAttachments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttachmentsSectionProps {
  organizationId: string;
  projectId?: string;
  taskId?: string;
  uploadedBy: string;
}

export const AttachmentsSection = ({
  organizationId,
  projectId,
  taskId,
  uploadedBy,
}: AttachmentsSectionProps) => {
  const { data: attachments = [], isLoading } = useAttachments({
    projectId,
    taskId,
  });

  const deleteMutation = useDeleteAttachment();
  const downloadMutation = useDownloadAttachment();

  const handleDelete = (id: string, fileUrl: string) => {
    deleteMutation.mutate({ id, fileUrl });
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    downloadMutation.mutate({ fileUrl, fileName });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FileUploadZone
          organizationId={organizationId}
          projectId={projectId}
          taskId={taskId}
          uploadedBy={uploadedBy}
        />

        <AttachmentList
          attachments={attachments}
          isLoading={isLoading}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      </CardContent>
    </Card>
  );
};
