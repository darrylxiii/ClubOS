import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  page_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  block_id: string | null;
  created_at: string;
  url?: string;
}

export function usePageAttachments(pageId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['page-attachments', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      
      const { data, error } = await supabase
        .from('page_attachments')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for each attachment
      const attachmentsWithUrls = await Promise.all(
        (data || []).map(async (att) => {
          const { data: urlData } = await supabase.storage
            .from('workspace-files')
            .createSignedUrl(att.file_path, 3600); // 1 hour expiry
          
          return {
            ...att,
            url: urlData?.signedUrl,
          };
        })
      );

      return attachmentsWithUrls as Attachment[];
    },
    enabled: !!pageId && !!user,
  });

  const uploadFile = useMutation({
    mutationFn: async ({ file, blockId }: { file: File; blockId?: string }) => {
      if (!user || !pageId) throw new Error('Not authenticated');

      const filePath = `${user.id}/${pageId}/${Date.now()}_${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error } = await supabase
        .from('page_attachments')
        .insert({
          page_id: pageId,
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          block_id: blockId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('workspace-files')
        .createSignedUrl(filePath, 3600);

      return { ...data, url: urlData?.signedUrl } as Attachment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-attachments', pageId] });
      toast.success('File uploaded successfully');
    },
    onError: (error) => {
      toast.error('Failed to upload file');
      console.error('Upload error:', error);
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) throw new Error('Attachment not found');

      // Delete from storage
      await supabase.storage
        .from('workspace-files')
        .remove([attachment.file_path]);

      // Delete record
      const { error } = await supabase
        .from('page_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-attachments', pageId] });
      toast.success('File deleted');
    },
    onError: () => {
      toast.error('Failed to delete file');
    },
  });

  return {
    attachments,
    isLoading,
    uploadFile,
    deleteAttachment,
  };
}
