import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Linkedin, RefreshCw, Sparkles, Target, Loader2 } from "lucide-react";
import { LinkedInEnrichmentProgress, type EnrichmentResult } from "@/components/jobs/email-dump/LinkedInEnrichmentProgress";

interface PipelineLinkedInSyncProps {
  jobId: string;
  onComplete: () => void;
}

export function PipelineLinkedInSync({ jobId, onComplete }: PipelineLinkedInSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'enriching' | 'scoring' | 'done'>('idle');
  const [enrichResults, setEnrichResults] = useState<EnrichmentResult[]>([]);
  const [scoreResult, setScoreResult] = useState<{ total: number; average_score: number } | null>(null);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    setPhase('enriching');
    setEnrichResults([]);
    setScoreResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const token = session.access_token;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Fetch all candidates in this job's pipeline with LinkedIn URLs
      const { data: apps } = await supabase
        .from('applications')
        .select('candidate_id')
        .eq('job_id', jobId)
        .eq('status', 'active');

      const candidateIds = [...new Set((apps || []).map(a => a.candidate_id).filter(Boolean))] as string[];

      if (candidateIds.length === 0) {
        toast.info('No candidates in pipeline to sync');
        setSyncing(false);
        setPhase('idle');
        return;
      }

      // Fetch which ones have LinkedIn URLs
      const { data: profiles } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, linkedin_url')
        .in('id', candidateIds);

      const withLinkedin = (profiles || []).filter(p => p.linkedin_url);
      const allIds = (profiles || []).map(p => p.id);

      // Initialize enrichment results
      const initialResults: EnrichmentResult[] = withLinkedin.map(p => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        status: 'pending' as const,
      }));
      setEnrichResults(initialResults);

      // Batch enrich (chunks of 10)
      const CHUNK = 10;
      const allResults = [...initialResults];

      for (let i = 0; i < withLinkedin.length; i += CHUNK) {
        const chunk = withLinkedin.slice(i, i + CHUNK);
        const chunkIds = chunk.map(c => c.id);

        // Mark as enriching
        for (const id of chunkIds) {
          const idx = allResults.findIndex(r => r.id === id);
          if (idx >= 0) allResults[idx] = { ...allResults[idx], status: 'enriching' };
        }
        setEnrichResults([...allResults]);

        try {
          const res = await fetch(`${baseUrl}/functions/v1/batch-linkedin-enrich`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': apiKey,
            },
            body: JSON.stringify({ candidate_ids: chunkIds }),
          });

          if (res.ok) {
            const data = await res.json();
            for (const r of data.results || []) {
              const idx = allResults.findIndex(ar => ar.id === r.id);
              if (idx >= 0) allResults[idx] = { ...allResults[idx], ...r };
            }
          } else {
            for (const id of chunkIds) {
              const idx = allResults.findIndex(r => r.id === id);
              if (idx >= 0) allResults[idx] = { ...allResults[idx], status: 'failed', reason: `HTTP ${res.status}` };
            }
          }
        } catch {
          for (const id of chunkIds) {
            const idx = allResults.findIndex(r => r.id === id);
            if (idx >= 0) allResults[idx] = { ...allResults[idx], status: 'failed', reason: 'Network error' };
          }
        }

        setEnrichResults([...allResults]);
        if (i + CHUNK < withLinkedin.length) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // Phase 2: Calculate skill match for ALL candidates
      setPhase('scoring');
      toast.info('Calculating skill match scores...');

      try {
        const scoreRes = await fetch(`${baseUrl}/functions/v1/calculate-skill-match`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': apiKey,
          },
          body: JSON.stringify({ job_id: jobId, candidate_ids: allIds }),
        });

        if (scoreRes.ok) {
          const scoreData = await scoreRes.json();
          setScoreResult({ total: scoreData.total, average_score: scoreData.average_score });
          toast.success(`Skill match scores updated — ${scoreData.total} candidates, avg ${scoreData.average_score}%`);
        }
      } catch (err) {
        console.error('[PipelineLinkedInSync] Skill match error:', err);
      }

      setPhase('done');
      onComplete();
    } catch (error) {
      console.error('[PipelineLinkedInSync] Error:', error);
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [jobId, onComplete]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSyncAll}
          disabled={syncing}
          variant="outline"
          className="gap-2 border-accent/50 hover:bg-accent/10"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Linkedin className="w-4 h-4" />
          )}
          {syncing ? (phase === 'scoring' ? 'Scoring Skills...' : 'Syncing LinkedIn...') : 'Sync All LinkedIn'}
        </Button>

        {scoreResult && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-accent/30">
              <Target className="w-3 h-3" />
              Avg Match: {scoreResult.average_score}%
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {scoreResult.total} scored
            </Badge>
          </div>
        )}
      </div>

      {enrichResults.length > 0 && (
        <LinkedInEnrichmentProgress
          results={enrichResults}
          isRunning={syncing && phase === 'enriching'}
          onRetryFailed={() => {
            const failedIds = enrichResults.filter(r => r.status === 'failed').map(r => r.id);
            if (failedIds.length > 0) handleSyncAll();
          }}
          onDismiss={() => {
            setEnrichResults([]);
            setScoreResult(null);
            setPhase('idle');
          }}
        />
      )}
    </div>
  );
}
