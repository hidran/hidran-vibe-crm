import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadAttachment } from "@/hooks/useAttachments";

interface FileUploadZoneProps {
  organizationId: string;
  projectId?: string;
  taskId?: string;
  uploadedBy: string;
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  // Documents
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/plain": [".txt"],
  // Images
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/svg+xml": [".svg"],
};

export const FileUploadZone = ({
  organizationId,
  projectId,
  taskId,
  uploadedBy,
  onUploadComplete,
}: FileUploadZoneProps) => {
  const uploadMutation = useUploadAttachment();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Upload files sequentially
      for (const file of acceptedFiles) {
        try {
          await uploadMutation.mutateAsync({
            file,
            organizationId,
            projectId,
            taskId,
            uploadedBy,
          });
        } catch (error) {
          // Error handling is done in the mutation's onError
          console.error("Upload error:", error);
        }
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    },
    [organizationId, projectId, taskId, uploadedBy, uploadMutation, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const isUploading = uploadMutation.isPending;

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop files here...</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or click to select files
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF, SVG (max 10MB)
              </p>
            </>
          )}
          {isUploading && (
            <p className="text-sm text-primary font-medium">Uploading...</p>
          )}
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="space-y-2">
          {fileRejections.map(({ file, errors }) => (
            <div
              key={file.name}
              className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
            >
              <FileWarning className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-destructive">{file.name}</p>
                {errors.map((error) => (
                  <p key={error.code} className="text-destructive/80">
                    {error.code === "file-too-large"
                      ? "File is larger than 10MB"
                      : error.code === "file-invalid-type"
                      ? "File type not supported"
                      : error.message}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
