import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, File, X, CheckCircle } from "lucide-react";

interface DeliverableUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestoneId: string;
  milestoneName: string;
  onUploadComplete?: () => void;
}

interface UploadedFile {
  name: string;
  size: number;
  path: string;
  url: string;
}

export function DeliverableUploadModal({
  open,
  onOpenChange,
  milestoneId,
  milestoneName,
  onUploadComplete,
}: DeliverableUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) => {
      // Max 50MB per file
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50MB limit`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded: UploadedFile[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const filePath = `deliverables/${milestoneId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("contract-files")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("contract-files")
          .getPublicUrl(filePath);

        uploaded.push({
          name: file.name,
          size: file.size,
          path: filePath,
          url: urlData.publicUrl,
        });

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      // Store deliverable records in database (if table exists)
      if (uploaded.length > 0) {
        try {
          // Try to insert deliverable records - table may not exist
          const { error: dbError } = await supabase
            .from("project_milestone_deliverables" as any)
            .insert(
              uploaded.map((f) => ({
                milestone_id: milestoneId,
                file_name: f.name,
                file_path: f.path,
                file_url: f.url,
                file_size: f.size,
                description: description || null,
              }))
            );

          if (dbError) {
            console.warn("Could not save deliverable records:", dbError);
          }
        } catch (err) {
          console.warn("Deliverable table may not exist:", err);
        }

        // Update milestone status to submitted
        await supabase
          .from("project_milestones")
          .update({ status: "submitted" })
          .eq("id", milestoneId);

        setUploadedFiles(uploaded);
        toast.success(`${uploaded.length} file(s) uploaded successfully`);
        onUploadComplete?.();
        
        // Reset and close
        setTimeout(() => {
          setFiles([]);
          setUploadedFiles([]);
          setDescription("");
          onOpenChange(false);
        }, 1500);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload deliverables");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Deliverables</DialogTitle>
          <DialogDescription>
            Submit files for milestone: <strong>{milestoneName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to select files or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max 50MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removeFile(idx)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes about these deliverables..."
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Success State */}
          {uploadedFiles.length > 0 && !isUploading && (
            <div className="flex items-center gap-2 text-green-600 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {uploadedFiles.length} file(s) uploaded successfully
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={files.length === 0 || isUploading}>
            {isUploading ? "Uploading..." : "Submit Deliverables"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
