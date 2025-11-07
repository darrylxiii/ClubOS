import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, X, CheckCircle2, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ResumeUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (documentId: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export function ResumeUploadModal({ open, onOpenChange, onUploadComplete }: ResumeUploadModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [documentType, setDocumentType] = useState<'resume' | 'cover_letter' | 'certificate'>('resume');
  const [isPrimary, setIsPrimary] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, DOC, or DOCX files only.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit.';
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const error = validateFile(droppedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setFile(droppedFile);
      
      // Generate preview URL for PDFs
      if (droppedFile.type === 'application/pdf') {
        const url = URL.createObjectURL(droppedFile);
        setPreviewUrl(url);
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const error = validateFile(selectedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setFile(selectedFile);
      
      // Generate preview URL for PDFs
      if (selectedFile.type === 'application/pdf') {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${documentType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('candidate-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // If setting as primary, unset other primary documents of same type
      if (isPrimary) {
        const { error: updateError } = await (supabase as any)
          .from('candidate_documents')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .eq('document_type', documentType);
        
        if (updateError) console.warn('Error unsetting primary:', updateError);
      }

      // Save document metadata to database
      const { data: document, error: dbError } = await (supabase as any)
        .from('candidate_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_mime_type: file.type,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success('Document uploaded successfully!');
      
      if (onUploadComplete && document) {
        onUploadComplete(document.id);
      }

      // Reset and close
      setTimeout(() => {
        handleClose();
      }, 500);

    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setDocumentType('resume');
    setIsPrimary(true);
    onOpenChange(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Upload your resume, cover letter, or certificates. Supported formats: PDF, DOC, DOCX (Max 10MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Type Selection */}
          {!file && (
            <div className="space-y-2">
              <Label>Document Type</Label>
              <RadioGroup value={documentType} onValueChange={(value: any) => setDocumentType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="resume" id="resume" />
                  <Label htmlFor="resume" className="cursor-pointer">Resume/CV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cover_letter" id="cover_letter" />
                  <Label htmlFor="cover_letter" className="cursor-pointer">Cover Letter</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="certificate" id="certificate" />
                  <Label htmlFor="certificate" className="cursor-pointer">Certificate</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Upload Area */}
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-all duration-200
                ${dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-accent/5'
                }
              `}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">
                  {dragActive ? 'Drop your file here' : 'Drag and drop your file here'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse
                </p>
                <Badge variant="outline">PDF, DOC, DOCX • Max 10MB</Badge>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Card */}
              <div className="border rounded-lg p-4 bg-accent/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {documentType === 'resume' ? 'Resume' : documentType === 'cover_letter' ? 'Cover Letter' : 'Certificate'}
                      </Badge>
                    </div>
                  </div>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* PDF Preview */}
                {previewUrl && file.type === 'application/pdf' && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Preview PDF
                    </Button>
                  </div>
                )}
              </div>

              {/* Primary Document Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Set as Primary {documentType === 'resume' ? 'Resume' : 'Document'}</Label>
                  <p className="text-xs text-muted-foreground">
                    This will be your default {documentType} for applications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-semibold">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Upload Complete */}
              {uploadProgress === 100 && !uploading && (
                <div className="flex items-center gap-2 text-green-500 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Upload complete!
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
