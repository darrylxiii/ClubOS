/**
 * Hook for CV parsing + enrichment pipeline
 * Triggers: parse-resume → enrich-candidate-profile (AI summary, tier, embedding)
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParseResult {
  skills: string[];
  experience: Array<{ title: string; company: string; duration: string }>;
  education: Array<{ degree: string; institution: string }>;
  languages?: string[];
  certifications?: string[];
  yearsOfExperience?: number;
}

export function useCVParseEnrichment() {
  const [parsing, setParsing] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const parseAndEnrich = async (candidateId: string, documentId?: string, fileUrl?: string) => {
    if (!documentId && !fileUrl) {
      toast.error('No document or file URL provided');
      return null;
    }

    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-resume', {
        body: {
          candidateId,
          documentId,
          fileUrl,
          triggerEnrichment: true,
          triggerNormalization: true,
        },
      });

      if (error) throw error;

      const result = data as { success: boolean; parsedResume: ParseResult };
      if (!result.success) throw new Error('Parse failed');

      const pr = result.parsedResume;
      const extractedCount = [
        pr.skills?.length || 0,
        pr.experience?.length || 0,
        pr.education?.length || 0,
      ].reduce((a, b) => a + b, 0);

      toast.success(`CV parsed: ${extractedCount} data points extracted. Enrichment running.`);
      return result.parsedResume;
    } catch (e: any) {
      console.error('CV parse error:', e);
      toast.error(e.message || 'Failed to parse CV');
      return null;
    } finally {
      setParsing(false);
    }
  };

  const enrichOnly = async (candidateId: string) => {
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-candidate-profile', {
        body: { candidate_id: candidateId },
      });

      if (error) throw error;
      toast.success('Profile enriched with AI summary, tier, and embedding.');
      return data;
    } catch (e: any) {
      console.error('Enrichment error:', e);
      toast.error(e.message || 'Enrichment failed');
      return null;
    } finally {
      setEnriching(false);
    }
  };

  const batchEnrich = async (candidateIds: string[]) => {
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-candidate-profile', {
        body: { batch_ids: candidateIds },
      });

      if (error) throw error;

      const result = data as { enriched: number; errors: number };
      toast.success(`Batch enrichment: ${result.enriched} enriched, ${result.errors} errors.`);
      return data;
    } catch (e: any) {
      console.error('Batch enrichment error:', e);
      toast.error(e.message || 'Batch enrichment failed');
      return null;
    } finally {
      setEnriching(false);
    }
  };

  return {
    parseAndEnrich,
    enrichOnly,
    batchEnrich,
    parsing,
    enriching,
    loading: parsing || enriching,
  };
}
