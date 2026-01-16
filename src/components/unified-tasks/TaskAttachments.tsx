import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Paperclip, Upload, X, FileText, Image, File, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string | null;
  user_id: string;
  task_id: string;
}

interface TaskAttachmentsProps {
  taskId: string;
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  const loadAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error loading attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${taskId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("task_attachments")
        .insert({
          task_id: taskId,
          user_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast.success("File uploaded successfully");
      loadAttachments();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = "";
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (attachment.user_id !== user?.id) {
      toast.error("You can only delete your own attachments");
      return;
    }

    try {
      // Extract file path from URL
      const urlParts = attachment.file_url.split("/task-attachments/");
      if (urlParts[1]) {
        await supabase.storage.from("task-attachments").remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachment.id);

      if (error) throw error;

      toast.success("Attachment deleted");
      loadAttachments();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete attachment");
    }
  };

  const getFileIcon = (type: string | null) => {
    if (!type) return File;
    if (type.startsWith("image/")) return Image;
    if (type.includes("pdf") || type.includes("document")) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments ({attachments.length})
        </h4>
        <label>
          <Input
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button variant="outline" size="sm" className="gap-2" asChild disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Upload"}
            </span>
          </Button>
        </label>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No attachments yet. Upload files to share with your team.
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.file_type);
            return (
              <Card key={attachment.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {attachment.file_name}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)} • {attachment.created_at ? format(new Date(attachment.created_at), "MMM d, yyyy") : 'Unknown'}
                    </p>
                  </div>
                  {attachment.user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleDelete(attachment)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
