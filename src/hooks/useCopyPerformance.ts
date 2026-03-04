import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubjectLinePerformance {
  subject_line: string;
  campaign_name: string;
  campaign_id: string;
  sends: number;
  opens: number;
  replies: number;
  open_rate: number;
  reply_rate: number;
  step_number: number;
}

export interface BodyCopyPerformance {
  body_preview: string;
  campaign_name: string;
  campaign_id: string;
  sends: number;
  replies: number;
  reply_rate: number;
  positive_replies: number;
  positive_rate: number;
  step_number: number;
}

export interface StepHeatmapData {
  step_number: number;
  avg_open_rate: number;
  avg_reply_rate: number;
  avg_positive_rate: number;
  total_sends: number;
  campaign_count: number;
}

export interface OutreachLearning {
  id: string;
  learning_type: string;
  pattern: string;
  evidence: Record<string, unknown>;
  sample_size: number;
  confidence_score: number;
  performance_lift: number | null;
  is_active: boolean;
  created_at: string;
}

export function useCopyPerformance() {
  const [subjectLines, setSubjectLines] = useState<SubjectLinePerformance[]>([]);
  const [bodyCopy, setBodyCopy] = useState<BodyCopyPerformance[]>([]);
  const [stepHeatmap, setStepHeatmap] = useState<StepHeatmapData[]>([]);
  const [learnings, setLearnings] = useState<OutreachLearning[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [stepsRes, learningsRes, repliesRes] = await Promise.all([
        supabase
          .from('instantly_sequence_steps')
          .select('*, campaign:crm_campaigns!instantly_sequence_steps_campaign_id_fkey(name)')
          .order('open_rate', { ascending: false }),
        supabase
          .from('crm_outreach_learnings')
          .select('*')
          .eq('is_active', true)
          .order('confidence_score', { ascending: false })
          .limit(20),
        supabase
          .from('crm_email_replies')
          .select('campaign_id, classification')
          .not('campaign_id', 'is', null),
      ]);

      const steps = (stepsRes.data || []) as any[];
      
      // Build positive reply counts per campaign
      const positiveRepliesByCampaign: Record<string, number> = {};
      (repliesRes.data || []).forEach((r: any) => {
        if (r.classification === 'interested' || r.classification === 'positive') {
          positiveRepliesByCampaign[r.campaign_id] = (positiveRepliesByCampaign[r.campaign_id] || 0) + 1;
        }
      });

      // Subject line leaderboard
      const subjects: SubjectLinePerformance[] = steps
        .filter(s => s.subject_line && s.total_sent > 0)
        .map(s => ({
          subject_line: s.subject_line,
          campaign_name: s.campaign?.name || 'Unknown',
          campaign_id: s.campaign_id,
          sends: s.total_sent || 0,
          opens: s.total_opens || 0,
          replies: s.total_replies || 0,
          open_rate: s.open_rate || 0,
          reply_rate: s.reply_rate || 0,
          step_number: s.step_number || 1,
        }))
        .sort((a, b) => b.open_rate - a.open_rate);

      // Body copy leaderboard
      const bodies: BodyCopyPerformance[] = steps
        .filter(s => s.body_text && s.total_sent > 0)
        .map(s => {
          const positiveCount = positiveRepliesByCampaign[s.campaign_id] || 0;
          return {
            body_preview: (s.body_text || '').slice(0, 120),
            campaign_name: s.campaign?.name || 'Unknown',
            campaign_id: s.campaign_id,
            sends: s.total_sent || 0,
            replies: s.total_replies || 0,
            reply_rate: s.reply_rate || 0,
            positive_replies: positiveCount,
            positive_rate: s.total_sent > 0 ? (positiveCount / s.total_sent) * 100 : 0,
            step_number: s.step_number || 1,
          };
        })
        .sort((a, b) => b.reply_rate - a.reply_rate);

      // Step heatmap
      const stepMap: Record<number, { opens: number[]; replies: number[]; positives: number[]; sends: number; campaigns: Set<string> }> = {};
      steps.forEach(s => {
        const n = s.step_number || 1;
        if (!stepMap[n]) stepMap[n] = { opens: [], replies: [], positives: [], sends: 0, campaigns: new Set() };
        if (s.total_sent > 0) {
          stepMap[n].opens.push(s.open_rate || 0);
          stepMap[n].replies.push(s.reply_rate || 0);
          stepMap[n].sends += s.total_sent || 0;
          stepMap[n].campaigns.add(s.campaign_id);
        }
      });

      const heatmap: StepHeatmapData[] = Object.entries(stepMap)
        .map(([num, data]) => ({
          step_number: parseInt(num),
          avg_open_rate: data.opens.length > 0 ? data.opens.reduce((a, b) => a + b, 0) / data.opens.length : 0,
          avg_reply_rate: data.replies.length > 0 ? data.replies.reduce((a, b) => a + b, 0) / data.replies.length : 0,
          avg_positive_rate: 0,
          total_sends: data.sends,
          campaign_count: data.campaigns.size,
        }))
        .sort((a, b) => a.step_number - b.step_number);

      setSubjectLines(subjects);
      setBodyCopy(bodies);
      setStepHeatmap(heatmap);
      setLearnings((learningsRes.data || []) as OutreachLearning[]);
    } catch (err) {
      console.error('Error fetching copy performance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { subjectLines, bodyCopy, stepHeatmap, learnings, loading, refetch: fetchData };
}
