import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, FileText, X, CheckCircle2, Loader2 } from "lucide-react";

interface MilestoneFileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestoneId: string;
  onUploadComplete: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function MilestoneFileUploadModal({
  open,
  onOpenChange,
  milestoneId,
  onUploadComplete,
}: MilestoneFileUploadModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      return;
    }

    setFile(selectedFile);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.size <= MAX_FILE_SIZE) {
      setFile(droppedFile);
    } else if (droppedFile) {
      toast.error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }
  }, []);

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${milestoneId}/${Date.now()}.${fileExt}`;
      const filePath = `contract-deliverables/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("contract-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("contract-files")
        .getPublicUrl(filePath);

      // Update milestone with file reference
      const { data: milestone, error: fetchError } = await supabase
        .from("project_milestones")
        .select("submitted_files")
        .eq("id", milestoneId)
        .single();

      if (fetchError) throw fetchError;

      const existingFiles = (milestone.submitted_files as any[]) || [];
      const newFile = {
        name: file.name,
        url: publicUrl,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("project_milestones")
        .update({
          submitted_files: [...existingFiles, newFile],
          updated_at: new Date().toISOString(),
        })
        .eq("id", milestoneId);

      if (updateError) throw updateError;

      toast.success("File uploaded successfully");
      setFile(null);
      setUploadProgress(0);
      onOpenChange(false);
      onUploadComplete();
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Deliverable</DialogTitle>
          <DialogDescription>
            Upload files related to this milestone deliverable. Supported formats: PDF, DOC, DOCX, ZIP, images (Max 50MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            >
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,.gif"
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, ZIP, images up to 50MB
                </p>
              </Label>
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {isUploading && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="mb-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


