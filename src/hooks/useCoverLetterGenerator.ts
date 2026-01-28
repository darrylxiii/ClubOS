import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CoverLetterTone = 'professional' | 'conversational' | 'executive';

interface GenerateResult {
  coverLetter: string;
  jobTitle: string;
  companyName: string;
  generatedAt: string;
}

export function useCoverLetterGenerator() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GenerateResult | null>(null);

  const generateCoverLetter = async (jobId: string, tone: CoverLetterTone = 'professional') => {
    if (!user) {
      toast.error('Please sign in to generate a cover letter');
      return null;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
        body: { jobId, tone },
      });

      if (error) {
        // Handle specific error codes
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message?.includes('402') || error.message?.includes('credits')) {
          toast.error('AI credits exhausted. Please add funds to continue.');
        } else {
          toast.error(error.message || 'Failed to generate cover letter');
        }
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      setGeneratedContent(data);
      toast.success('Cover letter generated!');
      return data;
    } catch (err) {
      console.error('Error generating cover letter:', err);
      toast.error('Failed to generate cover letter. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCoverLetter = async (
    content: string,
    jobId: string,
    jobTitle: string,
    companyName: string,
    tone: CoverLetterTone
  ) => {
    if (!user) {
      toast.error('Please sign in to save');
      return false;
    }

    setIsSaving(true);
    try {
      // Get candidate profile ID
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!candidateProfile) {
        toast.error('Candidate profile not found');
        return false;
      }

      // Create a text file with the cover letter content
      const fileName = `Cover Letter - ${companyName} - ${jobTitle}.txt`;
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      // Upload to storage
      const filePath = `${user.id}/cover-letters/${Date.now()}-${fileName}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('candidate-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // If bucket doesn't exist, save metadata only
        const { error: docError } = await supabase
          .from('candidate_documents')
          .insert({
            candidate_id: candidateProfile.id,
            document_type: 'cover_letter',
            file_name: fileName,
            file_url: null,
            metadata: {
              job_id: jobId,
              job_title: jobTitle,
              company_name: companyName,
              generated_with_ai: true,
              tone,
              content, // Store content in metadata as fallback
            },
          });

        if (docError) {
          throw docError;
        }
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('candidate-documents')
          .getPublicUrl(filePath);

        // Save document record
        const { error: docError } = await supabase
          .from('candidate_documents')
          .insert({
            candidate_id: candidateProfile.id,
            document_type: 'cover_letter',
            file_name: fileName,
            file_url: publicUrl,
            metadata: {
              job_id: jobId,
              job_title: jobTitle,
              company_name: companyName,
              generated_with_ai: true,
              tone,
            },
          });

        if (docError) {
          throw docError;
        }
      }

      toast.success('Cover letter saved to your documents!');
      return true;
    } catch (err) {
      console.error('Error saving cover letter:', err);
      toast.error('Failed to save cover letter');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard!');
      return true;
    } catch (err) {
      toast.error('Failed to copy');
      return false;
    }
  };

  const clearContent = () => {
    setGeneratedContent(null);
  };

  return {
    generateCoverLetter,
    saveCoverLetter,
    copyToClipboard,
    clearContent,
    isGenerating,
    isSaving,
    generatedContent,
  };
}
