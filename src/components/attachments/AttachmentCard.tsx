import { useState, useEffect } from "react";
import { Download, Trash2, MoreVertical, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FileIcon } from "./FileIcon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface AttachmentCardProps {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  uploaderName: string | null;
  uploaderEmail: string;
  onDelete: (id: string, fileUrl: string) => void;
  onDownload: (fileUrl: string, fileName: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 10) / 10 + " " + sizes[i];
};

export const AttachmentCard = ({
  id,
  fileName,
  fileType,
  fileSize,
  fileUrl,
  uploadedAt,
  uploaderName,
  uploaderEmail,
  onDelete,
  onDownload,
}: AttachmentCardProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const isImage = fileType.startsWith("image/");

  // Load thumbnail for images
  useEffect(() => {
    if (isImage) {
      supabase.storage
        .from("attachments")
        .createSignedUrl(fileUrl, 3600)
        .then(({ data, error }) => {
          if (!error && data) {
            setThumbnailUrl(data.signedUrl);
          }
        });
    }
  }, [fileUrl, isImage]);

  const handleDelete = () => {
    onDelete(id, fileUrl);
    setDeleteDialogOpen(false);
  };

  const handleDownload = () => {
    onDownload(fileUrl, fileName);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={fileName}
                className="h-10 w-10 rounded object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewDialogOpen(true)}
              />
            ) : (
              <div className="flex-shrink-0">
                <FileIcon fileType={fileType} className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium truncate">{fileName}</CardTitle>
              <CardDescription className="text-xs">
                {formatFileSize(fileSize)}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            <p>
              Uploaded {formatDistanceToNow(new Date(uploadedAt), { addSuffix: true })}
            </p>
            <p>by {uploaderName || uploaderEmail}</p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
          </DialogHeader>
          {thumbnailUrl && (
            <div className="flex items-center justify-center">
              <img
                src={thumbnailUrl}
                alt={fileName}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
