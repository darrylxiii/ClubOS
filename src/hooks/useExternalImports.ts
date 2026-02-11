import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExternalImport {
  id: string;
  content_type: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size_kb: number | null;
  mime_type: string | null;
  entity_type: string;
  entity_id: string;
  secondary_entity_type: string | null;
  secondary_entity_id: string | null;
  raw_content: string | null;
  parsed_content: any;
  ai_summary: string | null;
  action_items: any[];
  key_topics: string[];
  sentiment_score: number | null;
  sentiment_label: string | null;
  urgency_level: string;
  source_platform: string | null;
  original_date: string | null;
  duration_minutes: number | null;
  participants: string[];
  processing_status: string;
  transcription_status: string | null;
  analysis_status: string | null;
  error_message: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

interface UseExternalImportsOptions {
  entityType?: string;
  entityId?: string;
  contentType?: string;
  processingStatus?: string;
  limit?: number;
}

export function useExternalImports(options: UseExternalImportsOptions = {}) {
  const { entityType, entityId, contentType, processingStatus, limit = 50 } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['external-imports', options],
    queryFn: async () => {
      let q = supabase
        .from('external_context_imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entityType && entityId) {
        q = q.or(`and(entity_type.eq.${entityType},entity_id.eq.${entityId}),and(secondary_entity_type.eq.${entityType},secondary_entity_id.eq.${entityId})`);
      }

      if (contentType) {
        q = q.eq('content_type', contentType);
      }

      if (processingStatus) {
        q = q.eq('processing_status', processingStatus);
      }

      const { data, error } = await q;

      if (error) throw error;
      return data as ExternalImport[];
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: async (importId: string) => {
      // Reset status
      await supabase
        .from('external_context_imports')
        .update({ processing_status: 'pending', error_message: null })
        .eq('id', importId);

      // Trigger reprocessing
      const { error } = await supabase.functions.invoke('process-external-import', {
        body: { import_id: importId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reprocessing started');
      queryClient.invalidateQueries({ queryKey: ['external-imports'] });
    },
    onError: (error: unknown) => {
      toast.error('Failed to reprocess', { description: error instanceof Error ? error.message : 'Unknown error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase
        .from('external_context_imports')
        .delete()
        .eq('id', importId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Import deleted');
      queryClient.invalidateQueries({ queryKey: ['external-imports'] });
    },
    onError: (error: unknown) => {
      toast.error('Failed to delete', { description: error instanceof Error ? error.message : 'Unknown error' });
    },
  });

  return {
    imports: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    reprocess: reprocessMutation.mutate,
    isReprocessing: reprocessMutation.isPending,
    deleteImport: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    uploadImport: async (
      file: File | null,
      metadata: {
        title: string;
        contentType: string;
        entityType: string;
        entityId: string;
        sourcePlatform: string;
        rawContent?: string;
        secondaryEntityType?: string;
        secondaryEntityId?: string;
        metadata?: any;
      }
    ) => {
      try {
        let fileUrl = null;
        let fileSizeKb = null;
        let fileName = null;
        let mimeType = null;

        if (file) {
          const fileExt = file.name.split('.').pop();
          const filePath = `${metadata.entityId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

          const { error: uploadError } = await supabase.storage
            .from('meeting-recordings') // Using existing bucket
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('meeting-recordings')
            .getPublicUrl(filePath);

          fileUrl = publicUrl;
          fileSizeKb = Math.round(file.size / 1024);
          fileName = file.name;
          mimeType = file.type;
        }

        const { data: importRecord, error: insertError } = await supabase
          .from('external_context_imports')
          .insert({
            title: metadata.title,
            content_type: metadata.contentType,
            entity_type: metadata.entityType,
            entity_id: metadata.entityId,
            source_platform: metadata.sourcePlatform,
            raw_content: metadata.rawContent,
            secondary_entity_type: metadata.secondaryEntityType,
            secondary_entity_id: metadata.secondaryEntityId,
            file_url: fileUrl,
            file_name: fileName,
            file_size_kb: fileSizeKb,
            mime_type: mimeType,
            processing_status: 'pending',
            metadata: metadata.metadata,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Trigger processing
        const { error: processError } = await supabase.functions.invoke('process-external-import', {
          body: { import_id: importRecord.id },
        });

        if (processError) {
          console.error('Processing trigger error:', processError);
          toast.warning('Import uploaded but processing failed to start automatically.');
        } else {
          toast.success('Import uploaded and processing started');
        }

        queryClient.invalidateQueries({ queryKey: ['external-imports'] });
        return importRecord;

      } catch (error: unknown) {
        console.error('Upload import error:', error);
        toast.error('Failed to upload import', { description: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    }
  };
}

export function useExternalImport(importId: string | undefined) {
  return useQuery({
    queryKey: ['external-import', importId],
    queryFn: async () => {
      if (!importId) return null;

      const { data, error } = await supabase
        .from('external_context_imports')
        .select('*')
        .eq('id', importId)
        .single();

      if (error) throw error;
      return data as ExternalImport;
    },
    enabled: !!importId,
  });
}
