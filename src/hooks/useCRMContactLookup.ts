import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CRMProspect } from '@/types/crm-enterprise';

interface CRMContactLookupResult {
  prospect: CRMProspect | null;
  loading: boolean;
  found: boolean;
}

// Cache for email lookups to avoid repeated queries
const lookupCache = new Map<string, CRMProspect | null>();

export function useCRMContactLookup(email: string | null | undefined): CRMContactLookupResult {
  const [prospect, setProspect] = useState<CRMProspect | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      setProspect(null);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check cache first
    if (lookupCache.has(normalizedEmail)) {
      setProspect(lookupCache.get(normalizedEmail) || null);
      return;
    }

    const lookup = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('crm_prospects')
          .select('*')
          .eq('email', normalizedEmail)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('CRM contact lookup error:', error);
        }

        const result = data as CRMProspect | null;
        lookupCache.set(normalizedEmail, result);
        setProspect(result);
      } catch (err) {
        console.error('CRM contact lookup error:', err);
        setProspect(null);
      } finally {
        setLoading(false);
      }
    };

    lookup();
  }, [email]);

  return {
    prospect,
    loading,
    found: !!prospect,
  };
}

// Batch lookup for multiple emails
export function useCRMBatchContactLookup(emails: string[]) {
  const [prospects, setProspects] = useState<Map<string, CRMProspect>>(new Map());
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async () => {
    if (emails.length === 0) return;

    // Filter out already cached emails
    const uncachedEmails = emails.filter(e => !lookupCache.has(e.toLowerCase().trim()));

    if (uncachedEmails.length === 0) {
      // All are cached, build result from cache
      const result = new Map<string, CRMProspect>();
      emails.forEach(email => {
        const cached = lookupCache.get(email.toLowerCase().trim());
        if (cached) result.set(email, cached);
      });
      setProspects(result);
      return;
    }

    setLoading(true);
    try {
      const normalizedEmails = uncachedEmails.map(e => e.toLowerCase().trim());

      const { data, error } = await supabase
        .from('crm_prospects')
        .select('*')
        .in('email', normalizedEmails);

      if (error) throw error;

      // Update cache
      normalizedEmails.forEach(email => {
        const found = (data || []).find((p: any) => p.email?.toLowerCase() === email);
        lookupCache.set(email, found as CRMProspect || null);
      });

      // Build result from cache
      const result = new Map<string, CRMProspect>();
      emails.forEach(email => {
        const cached = lookupCache.get(email.toLowerCase().trim());
        if (cached) result.set(email, cached);
      });
      setProspects(result);
    } catch (err) {
      console.error('Batch CRM contact lookup error:', err);
    } finally {
      setLoading(false);
    }
  }, [emails.join(',')]);

  useEffect(() => {
    lookup();
  }, [lookup]);

  return {
    prospects,
    loading,
    getProspect: (email: string) => prospects.get(email) || null,
  };
}

// Helper to get CRM badge for an email
export function getCRMBadgeInfo(prospect: CRMProspect | null) {
  if (!prospect) return null;

  return {
    stage: prospect.stage,
    leadScore: prospect.lead_score,
    company: prospect.company_name,
    sentiment: prospect.reply_sentiment,
    dealValue: prospect.deal_value,
    prospectId: prospect.id,
  };
}
