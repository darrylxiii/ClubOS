import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OfferLetterTemplate {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  template_content: string;
  template_variables: string[];
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface OfferLetterData {
  candidate_name: string;
  job_title: string;
  company_name: string;
  start_date: string;
  base_salary: number;
  bonus: string;
  benefits: string;
  probation_period: number;
  expiry_date: string;
  signatory_name: string;
  signatory_title: string;
  currency?: string;
}

export function useOfferLetterTemplates(companyId?: string) {
  return useQuery({
    queryKey: ['offer-letter-templates', companyId],
    queryFn: async (): Promise<OfferLetterTemplate[]> => {
      let query = supabase
        .from('offer_letter_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((t: any) => ({
        ...t,
        template_variables: t.template_variables || [],
      }));
    },
  });
}

export function useGenerateOfferLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      templateId,
      data,
    }: {
      offerId: string;
      templateId: string;
      data: OfferLetterData;
    }) => {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('offer_letter_templates')
        .select('template_content')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Replace variables in template
      let content = template.template_content;
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, String(value));
      });

      // Generate PDF using jsPDF (client-side)
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add content with proper formatting
      const lines = content.split('\n');
      let y = 20;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = doc.internal.pageSize.width - 2 * margin;

      doc.setFontSize(12);
      
      for (const line of lines) {
        const splitLines = doc.splitTextToSize(line, maxWidth);
        for (const splitLine of splitLines) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(splitLine, margin, y);
          y += lineHeight;
        }
      }

      // Convert to blob and upload to storage
      const pdfBlob = doc.output('blob');
      const fileName = `offer-letter-${offerId}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('offer-letters')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
        });

      if (uploadError) {
        // If bucket doesn't exist, we skip storage and just update the record
        console.warn('Storage upload failed:', uploadError);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('offer-letters')
        .getPublicUrl(fileName);

      // Update offer with generated letter URL
      const { error: updateError } = await supabase
        .from('candidate_offers')
        .update({
          template_id: templateId,
          generated_letter_url: urlData?.publicUrl || null,
          letter_generated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (updateError) throw updateError;

      return { url: urlData?.publicUrl, blob: pdfBlob };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-offers'] });
      toast.success('Offer letter generated successfully');
    },
    onError: (error) => {
      console.error('Error generating offer letter:', error);
      toast.error('Failed to generate offer letter');
    },
  });
}

export function useCreateOfferTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<OfferLetterTemplate, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('offer_letter_templates')
        .insert({
          ...template,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letter-templates'] });
      toast.success('Template created successfully');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    },
  });
}
