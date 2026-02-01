import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Upload, FileText, Image, File, X, 
  Loader2, CheckCircle2, AlertTriangle, GripVertical 
} from 'lucide-react';

interface ProposalAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  file_url: string;
  sort_order: number;
}

interface ProposalAttachmentUploaderProps {
  proposalId: string;
  attachments: ProposalAttachment[];
  onAttachmentsChange: (attachments: ProposalAttachment[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/zip': ['.zip'],
};

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf')) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProposalAttachmentUploader({
  proposalId,
  attachments,
  onAttachmentsChange,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
}: ProposalAttachmentUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Please sign in to upload files');
      return;
    }

    const remainingSlots = maxFiles - attachments.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const filesToUpload = acceptedFiles.slice(0, remainingSlots);
    
    // Validate file sizes
    const oversizedFiles = filesToUpload.filter(f => f.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      toast.error(`Files must be under ${formatFileSize(maxSizeBytes)}`);
      return;
    }

    setUploading(true);
    const newAttachments: ProposalAttachment[] = [];

    try {
      for (const file of filesToUpload) {
        const fileId = crypto.randomUUID();
        const storagePath = `${user.id}/${proposalId}/${fileId}-${file.name}`;
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('proposal-attachments')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('proposal-attachments')
          .getPublicUrl(storagePath);

        // Create database record
        const { data: attachment, error: dbError } = await supabase
          .from('proposal_attachments' as any)
          .insert({
            proposal_id: proposalId,
            user_id: user.id,
            file_name: file.name,
            file_type: file.type,
            file_size_bytes: file.size,
            file_url: urlData.publicUrl,
            storage_path: storagePath,
            sort_order: attachments.length + newAttachments.length,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        newAttachments.push(attachment as unknown as ProposalAttachment);
      }

      onAttachmentsChange([...attachments, ...newAttachments]);
      toast.success(`${newAttachments.length} file(s) uploaded`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [user, proposalId, attachments, onAttachmentsChange, maxFiles, maxSizeBytes]);

  const removeAttachment = async (attachment: ProposalAttachment) => {
    try {
      // Delete from storage (using storage_path from full attachment data)
      const { data: fullData } = await supabase
        .from('proposal_attachments' as any)
        .select('storage_path')
        .eq('id', attachment.id)
        .single();

      if ((fullData as any)?.storage_path) {
        await supabase.storage
          .from('proposal-attachments')
          .remove([(fullData as any).storage_path]);
      }

      // Delete from database
      await supabase
        .from('proposal_attachments' as any)
        .delete()
        .eq('id', attachment.id);

      onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
      toast.success('File removed');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error('Failed to remove file');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: maxFiles - attachments.length,
    maxSize: maxSizeBytes,
    disabled: uploading || attachments.length >= maxFiles,
  });

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${uploading || attachments.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-primary font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOC, images, ZIP • Max {formatFileSize(maxSizeBytes)} per file • {maxFiles - attachments.length} slots remaining
            </p>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([fileName, progress]) => (
        <Card key={fileName} className="p-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{fileName}</p>
              <Progress value={progress} className="h-1 mt-1" />
            </div>
          </div>
        </Card>
      ))}

      {/* Uploaded Files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);
            return (
              <Card key={attachment.id} className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <FileIcon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size_bytes)}
                    </p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeAttachment(attachment)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
