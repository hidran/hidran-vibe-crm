import { AttachmentCard } from "./AttachmentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { FileX } from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

interface AttachmentListProps {
  attachments: Attachment[];
  isLoading: boolean;
  onDelete: (id: string, fileUrl: string) => void;
  onDownload: (fileUrl: string, fileName: string) => void;
}

export const AttachmentList = ({
  attachments,
  isLoading,
  onDelete,
  onDownload,
}: AttachmentListProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileX className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No attachments</h3>
        <p className="text-sm text-muted-foreground">
          Upload files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {attachments.map((attachment) => (
        <AttachmentCard
          key={attachment.id}
          id={attachment.id}
          fileName={attachment.file_name}
          fileType={attachment.file_type}
          fileSize={attachment.file_size}
          fileUrl={attachment.file_url}
          uploadedAt={attachment.created_at}
          uploaderName={attachment.profiles?.full_name || null}
          uploaderEmail={attachment.profiles?.email || "Unknown"}
          onDelete={onDelete}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
};
