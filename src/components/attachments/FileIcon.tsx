import { FileText, Image, FileSpreadsheet, File } from "lucide-react";

interface FileIconProps {
  fileType: string;
  className?: string;
}

export const FileIcon = ({ fileType, className }: FileIconProps) => {
  // Determine icon based on file type
  if (fileType.startsWith("image/")) {
    return <Image className={className} />;
  }

  switch (fileType) {
    case "application/pdf":
    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "text/plain":
      return <FileText className={className} />;

    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return <FileSpreadsheet className={className} />;

    default:
      return <File className={className} />;
  }
};
