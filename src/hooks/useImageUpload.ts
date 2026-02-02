import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseImageUploadOptions {
  bucket: string;
  userId: string;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

interface UploadResult {
  url: string;
  path: string;
}

export function useImageUpload({
  bucket,
  userId,
  onSuccess,
  onError,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
}: UseImageUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.some((type) => file.type.startsWith(type.replace('/*', '')))) {
      return `Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`;
    }
    if (file.size > maxFileSize) {
      return `File too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`;
    }
    return null;
  }, [acceptedTypes, maxFileSize]);

  const uploadBlob = useCallback(async (
    blob: Blob,
    fileName?: string
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);

    try {
      const extension = blob.type.split('/')[1] || 'jpg';
      const finalFileName = fileName || `${Date.now()}.${extension}`;
      const filePath = `${userId}/${finalFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: blob.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Add cache busting
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      onSuccess?.(cacheBustedUrl);
      setProgress(100);

      return { url: cacheBustedUrl, path: filePath };
    } catch (error) {
      console.error('Upload error:', error);
      const err = error instanceof Error ? error : new Error('Upload failed');
      onError?.(err);
      toast.error(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, [bucket, userId, onSuccess, onError]);

  const uploadFile = useCallback(async (file: File): Promise<UploadResult | null> => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return null;
    }
    return uploadBlob(file, file.name);
  }, [validateFile, uploadBlob]);

  const deleteFile = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Extract path from URL
      const path = url.split('/').slice(-2).join('/').split('?')[0];
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }, [bucket]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setUploading(false);
    setProgress(0);
  }, []);

  return {
    uploading,
    progress,
    uploadFile,
    uploadBlob,
    deleteFile,
    validateFile,
    cancel,
  };
}
