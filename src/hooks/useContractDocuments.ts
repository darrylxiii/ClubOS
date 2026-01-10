import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContractDocument {
  id: string;
  contract_id: string;
  contract_type: string | null;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size_kb: number | null;
  document_type: string;
  uploaded_by: string;
  created_at: string;
  is_active: boolean | null;
  version: number | null;
  notes: string | null;
}

export function useContractDocuments(contractId: string) {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['contract-documents', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ContractDocument[];
    },
    enabled: !!contractId
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, documentType, notes }: { file: File; documentType: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filePath = `${contractId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('contract_documents')
        .insert({
          contract_id: contractId,
          contract_type: 'project',
          file_name: file.name,
          file_url: filePath,
          mime_type: file.type,
          file_size_kb: Math.round(file.size / 1024),
          document_type: documentType,
          uploaded_by: user.id,
          notes: notes || null
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-documents', contractId] });
      toast.success('Document uploaded');
    },
    onError: (error) => toast.error('Upload failed: ' + error.message)
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('contract_documents')
        .update({ is_active: false })
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-documents', contractId] });
      toast.success('Document deleted');
    }
  });

  const getDownloadUrl = async (filePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('contract-documents')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  return { documents, isLoading, uploadDocument, deleteDocument, getDownloadUrl };
}
