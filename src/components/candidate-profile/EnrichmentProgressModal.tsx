import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Loader2, CheckCircle, XCircle, SkipForward,
  Linkedin, Github, Globe, Brain, RefreshCw, Sparkles, Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { candidateProfileTokens } from '@/config/candidate-profile-tokens';
import { cn } from '@/lib/utils';

type StepStatus = 'pending' | 'running' | 'complete' | 'failed' | 'skipped';

interface EnrichmentStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: StepStatus;
  result?: string;
  details?: string[];
  error?: string;
}

interface EnrichmentProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'linkedin' | 'deep-enrich';
  candidateId: string;
  candidateData: any;
  onComplete: () => void;
}

const STATUS_ICONS: Record<StepStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-muted-foreground" />,
  running: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  complete: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  skipped: <SkipForward className="w-4 h-4 text-muted-foreground" />,
};

const LINKEDIN_STEPS: () => EnrichmentStep[] = () => [
  { id: 'scrape', label: 'Scraping LinkedIn Profile', icon: <Linkedin className="w-4 h-4" />, status: 'pending' },
  { id: 'update', label: 'Updating Candidate Fields', icon: <RefreshCw className="w-4 h-4" />, status: 'pending' },
  { id: 'intelligence', label: 'Recalculating Profile Intelligence', icon: <Brain className="w-4 h-4" />, status: 'pending' },
];

const DEEP_ENRICH_STEPS: () => EnrichmentStep[] = () => [
  { id: 'github', label: 'Scanning GitHub Profile', icon: <Github className="w-4 h-4" />, status: 'pending' },
  { id: 'presence', label: 'Searching Public Mentions', icon: <Globe className="w-4 h-4" />, status: 'pending' },
  { id: 'brief', label: 'Generating AI Intelligence Brief', icon: <Sparkles className="w-4 h-4" />, status: 'pending' },
];

export const EnrichmentProgressModal: React.FC<EnrichmentProgressModalProps> = ({
  open,
  onOpenChange,
  mode,
  candidateId,
  candidateData,
  onComplete,
}) => {
  const [steps, setSteps] = useState<EnrichmentStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [summary, setSummary] = useState<{ totalFields: number; highlights: string[] } | null>(null);
  const hasStarted = useRef(false);

  const updateStep = useCallback((id: string, patch: Partial<EnrichmentStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const progress = steps.length
    ? Math.round((steps.filter(s => s.status === 'complete' || s.status === 'failed' || s.status === 'skipped').length / steps.length) * 100)
    : 0;

  // Initialize steps when modal opens
  useEffect(() => {
    if (open) {
      hasStarted.current = false;
      setIsDone(false);
      setSummary(null);
      setSteps(mode === 'linkedin' ? LINKEDIN_STEPS() : DEEP_ENRICH_STEPS());
    }
  }, [open, mode]);

  // Start execution once steps are initialized
  useEffect(() => {
    if (open && steps.length > 0 && !hasStarted.current && !isRunning) {
      hasStarted.current = true;
      if (mode === 'linkedin') {
        runLinkedInSync();
      } else {
        runDeepEnrich();
      }
    }
  }, [open, steps.length]);

  const runLinkedInSync = async () => {
    setIsRunning(true);
    const summaryHighlights: string[] = [];
    let fieldsUpdated = 0;

    // Step 1: Scrape
    updateStep('scrape', { status: 'running' });
    let scraperData: any = null;
    try {
      if (!candidateData.linkedin_url) {
        updateStep('scrape', { status: 'failed', error: 'No LinkedIn URL found' });
        setIsRunning(false);
        setIsDone(true);
        return;
      }
      const { data, error } = await supabase.functions.invoke('linkedin-scraper', {
        body: { linkedinUrl: candidateData.linkedin_url },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Scraper returned no data');
      scraperData = data.data;

      const foundFields: string[] = [];
      if (scraperData.full_name) foundFields.push('name');
      if (scraperData.current_title) foundFields.push('title');
      if (scraperData.current_company) foundFields.push('company');
      if (scraperData.avatar_url) foundFields.push('avatar');
      if (scraperData.skills?.length) foundFields.push(`${scraperData.skills.length} skills`);
      if (scraperData.work_history?.length) foundFields.push(`${scraperData.work_history.length} work entries`);
      if (scraperData.education?.length) foundFields.push(`${scraperData.education.length} education entries`);

      updateStep('scrape', {
        status: 'complete',
        result: `Found: ${foundFields.join(', ')}`,
        details: foundFields,
      });
    } catch (err: any) {
      updateStep('scrape', { status: 'failed', error: err.message || 'Scrape failed' });
      setIsRunning(false);
      setIsDone(true);
      return;
    }

    // Step 2: Update profile
    updateStep('update', { status: 'running' });
    try {
      const d = scraperData;
      const updates: Record<string, unknown> = {};

      if (d.full_name) updates.full_name = d.full_name;
      if (d.current_title) updates.current_title = d.current_title;
      if (d.current_company) updates.current_company = d.current_company;
      if (d.avatar_url) updates.avatar_url = d.avatar_url;
      if (d.years_of_experience) updates.years_of_experience = d.years_of_experience;
      if (d.work_history?.length) updates.work_history = d.work_history;
      if (d.education?.length) updates.education = d.education;
      if (d.ai_summary) updates.ai_summary = d.ai_summary;
      if (d.linkedin_profile_data) updates.linkedin_profile_data = d.linkedin_profile_data;

      if (d.skills?.length) {
        const existing = Array.isArray(candidateData.skills) ? candidateData.skills : [];
        const merged = [...new Set([...existing, ...d.skills])];
        updates.skills = merged;
        const newSkills = merged.length - existing.length;
        if (newSkills > 0) summaryHighlights.push(`${newSkills} new skills merged`);
      }

      updates.enrichment_last_run = new Date().toISOString();
      updates.last_profile_update = new Date().toISOString();
      updates.enrichment_data = {
        source: 'linkedin',
        api_used: d.source_metadata?.api_used || 'unknown',
        enriched_at: new Date().toISOString(),
        fields_updated: Object.keys(updates),
      };

      fieldsUpdated = Object.keys(updates).length;

      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update(updates)
        .eq('id', candidateId);

      if (updateError) throw updateError;

      const updatedNames = Object.keys(updates).filter(k => !['enrichment_last_run', 'last_profile_update', 'enrichment_data'].includes(k));
      updateStep('update', {
        status: 'complete',
        result: `Updated ${updatedNames.length} fields`,
        details: updatedNames,
      });
      summaryHighlights.push(`${updatedNames.length} profile fields updated`);
    } catch (err: any) {
      updateStep('update', { status: 'failed', error: err.message || 'Update failed' });
    }

    // Step 3: Intelligence recalculation
    updateStep('intelligence', { status: 'running' });
    try {
      const { data: enrichResult } = await supabase.functions.invoke('enrich-candidate-profile', {
        body: { candidateId },
      });
      const details: string[] = [];
      if (enrichResult?.completeness != null) details.push(`Completeness: ${enrichResult.completeness}%`);
      if (enrichResult?.talent_tier) details.push(`Tier: ${enrichResult.talent_tier}`);

      updateStep('intelligence', {
        status: 'complete',
        result: details.length ? details.join(' · ') : 'Recalculated successfully',
        details,
      });
      if (enrichResult?.talent_tier) summaryHighlights.push(`Talent tier: ${enrichResult.talent_tier}`);
    } catch (err: any) {
      updateStep('intelligence', { status: 'failed', error: err.message || 'Intelligence recalculation failed' });
    }

    setSummary({ totalFields: fieldsUpdated, highlights: summaryHighlights });
    setIsRunning(false);
    setIsDone(true);
    onComplete();
  };

  const runDeepEnrich = async () => {
    setIsRunning(true);
    const summaryHighlights: string[] = [];
    let totalDataPoints = 0;

    // Step 1: GitHub
    updateStep('github', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('enrich-github-profile', {
        body: { candidateId },
      });
      if (error) throw error;

      if (data?.skipped) {
        updateStep('github', { status: 'skipped', result: 'No GitHub profile found' });
      } else {
        const repos = data?.repos_count || data?.public_repos || 0;
        const stars = data?.total_stars || 0;
        const langs = data?.top_languages?.slice(0, 3)?.join(', ') || 'N/A';
        const details = [`${repos} repositories`, `${stars} stars`, `Top: ${langs}`];
        updateStep('github', {
          status: 'complete',
          result: `Found profile: ${repos} repos, ${stars} stars`,
          details,
        });
        totalDataPoints += repos;
        summaryHighlights.push(`GitHub: ${repos} repos discovered`);
      }
    } catch (err: any) {
      updateStep('github', { status: 'failed', error: err.message || 'GitHub scan failed' });
    }

    // Step 2: Public presence
    updateStep('presence', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('enrich-public-presence', {
        body: { candidateId },
      });
      if (error) throw error;

      const mentions = data?.mentions_count || data?.total_mentions || 0;
      const articles = data?.articles_count || 0;
      const talks = data?.talks_count || 0;
      const press = data?.press_count || 0;

      if (mentions === 0 && articles === 0 && talks === 0 && press === 0) {
        updateStep('presence', { status: 'complete', result: 'No public mentions found' });
      } else {
        const parts: string[] = [];
        if (articles > 0) parts.push(`${articles} articles`);
        if (talks > 0) parts.push(`${talks} talks`);
        if (press > 0) parts.push(`${press} press mentions`);
        const resultText = parts.length ? parts.join(', ') : `${mentions} mentions`;
        updateStep('presence', {
          status: 'complete',
          result: `Found: ${resultText}`,
          details: parts,
        });
        totalDataPoints += mentions || (articles + talks + press);
        summaryHighlights.push(`Public presence: ${resultText}`);
      }
    } catch (err: any) {
      updateStep('presence', { status: 'failed', error: err.message || 'Public presence scan failed' });
    }

    // Step 3: AI Brief
    updateStep('brief', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('generate-candidate-brief', {
        body: { candidateId },
      });
      if (error) throw error;

      const differentiators = data?.differentiators_count || data?.differentiators?.length || 0;
      const risks = data?.risk_factors_count || data?.risk_factors?.length || 0;
      const skills = data?.skill_verifications_count || data?.skill_verifications?.length || 0;
      const details = [
        'Executive summary generated',
        `${differentiators} differentiators`,
        `${risks} risk factors`,
        `${skills} skill verifications`,
      ];
      updateStep('brief', {
        status: 'complete',
        result: details.join(' · '),
        details,
      });
      totalDataPoints += differentiators + risks + skills;
      summaryHighlights.push(`AI brief: ${differentiators} differentiators, ${skills} skill verifications`);
    } catch (err: any) {
      updateStep('brief', { status: 'failed', error: err.message || 'AI brief generation failed' });
    }

    setSummary({ totalFields: totalDataPoints, highlights: summaryHighlights });
    setIsRunning(false);
    setIsDone(true);
    onComplete();
  };

  const handleClose = () => {
    if (!isRunning) {
      onOpenChange(false);
    }
  };

  const modeTitle = mode === 'linkedin' ? 'LinkedIn Sync' : 'Deep Enrichment';

  return (
    <Dialog open={open} onOpenChange={isRunning ? undefined : onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-lg',
          candidateProfileTokens.glass.strong,
          'border-border/50'
        )}
        onPointerDownOutside={e => { if (isRunning) e.preventDefault(); }}
        onEscapeKeyDown={e => { if (isRunning) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {mode === 'linkedin' ? (
              <Linkedin className="w-5 h-5 text-blue-500" />
            ) : (
              <Sparkles className="w-5 h-5 text-primary" />
            )}
            {modeTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{isRunning ? 'Processing...' : isDone ? 'Complete' : 'Starting...'}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2 my-2">
          <AnimatePresence mode="sync">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  step.status === 'running' && 'border-blue-500/30 bg-blue-500/5',
                  step.status === 'complete' && 'border-green-500/20 bg-green-500/5',
                  step.status === 'failed' && 'border-red-500/20 bg-red-500/5',
                  step.status === 'skipped' && 'border-border/30 bg-muted/30',
                  step.status === 'pending' && 'border-border/30 bg-card/50',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">{STATUS_ICONS[step.status]}</div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-muted-foreground">
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{step.label}</p>
                    <AnimatePresence>
                      {step.result && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs text-muted-foreground mt-1"
                        >
                          {step.result}
                        </motion.p>
                      )}
                      {step.error && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs text-red-400 mt-1"
                        >
                          {step.error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary card */}
        <AnimatePresence>
          {isDone && summary && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2"
            >
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Enrichment Summary
              </h4>
              {summary.highlights.length > 0 ? (
                <ul className="space-y-1">
                  {summary.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No new data was found during this enrichment run.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] text-muted-foreground/60">Powered by QUIN</span>
          <Button
            onClick={handleClose}
            disabled={isRunning}
            variant={isDone ? 'default' : 'outline'}
            size="sm"
          >
            {isDone ? (
              <>
                <Eye className="w-4 h-4 mr-1" />
                View Updated Profile
              </>
            ) : (
              'Close'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnrichmentProgressModal;
