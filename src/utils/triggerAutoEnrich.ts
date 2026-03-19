import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Auto-enrich candidate(s) via LinkedIn then calculate skill match scores.
 * Fire-and-forget — shows toast progress.
 */
export async function triggerAutoEnrich(
  candidateIds: string[],
  jobId: string,
  options?: { silent?: boolean }
) {
  if (candidateIds.length === 0) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  const token = session.access_token;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!options?.silent) {
    toast.info('Auto-enriching profiles from LinkedIn...', { duration: 3000 });
  }

  // Batch in chunks of 10 (max for batch-linkedin-enrich)
  const CHUNK = 10;
  const enrichedIds: string[] = [];

  for (let i = 0; i < candidateIds.length; i += CHUNK) {
    const chunk = candidateIds.slice(i, i + CHUNK);
    try {
      const res = await fetch(`${baseUrl}/functions/v1/batch-linkedin-enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': apiKey,
        },
        body: JSON.stringify({ candidate_ids: chunk }),
      });

      if (res.ok) {
        const data = await res.json();
        const ids = (data.results || [])
          .filter((r: any) => r.status === 'enriched')
          .map((r: any) => r.id);
        enrichedIds.push(...ids);
      }
    } catch (err) {
      console.error('[autoEnrich] batch-linkedin-enrich chunk failed:', err);
    }
  }

  // Now calculate skill match for ALL candidates (enriched or not — they may already have skills)
  try {
    await fetch(`${baseUrl}/functions/v1/calculate-skill-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': apiKey,
      },
      body: JSON.stringify({ job_id: jobId, candidate_ids: candidateIds }),
    });
  } catch (err) {
    console.error('[autoEnrich] calculate-skill-match failed:', err);
  }

  if (!options?.silent && enrichedIds.length > 0) {
    toast.success(`Enriched ${enrichedIds.length} profile${enrichedIds.length !== 1 ? 's' : ''} & updated skill scores`);
  }
}
