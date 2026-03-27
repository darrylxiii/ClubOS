import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionLoader } from '@/components/ui/unified-loader';
import { AlertCircle, Lock, Building2, ExternalLink, Eye } from 'lucide-react';
import { PipelineShareBoard } from '@/components/jobs/shared-pipeline/PipelineShareBoard';
import type { VisibilitySettings } from '@/components/jobs/shared-pipeline/SharedCandidateCard';
import { format } from 'date-fns';

interface ShareMeta extends VisibilitySettings {
  job_id: string;
  expires_at: string;
  is_password_protected: boolean;
}

interface JobInfo {
  title: string;
  pipeline_stages: { name: string; order: number; color?: string }[];
  company_name?: string;
  company_logo_url?: string;
}

interface Application {
  id: string;
  full_name: string;
  current_title?: string;
  current_company?: string;
  email?: string;
  linkedin_url?: string;
  match_score?: number;
  ai_summary?: string;
  applied_at?: string;
  current_stage_index: number;
}

type ViewState = 'loading' | 'password_gate' | 'ready' | 'error';

export default function SharedPipelineView() {
  const { t } = useTranslation('jobs');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid share link.');
      setViewState('error');
      return;
    }
    checkToken();
  }, [token]);

  // Step 1: Check if token is valid and whether password is needed
  const checkToken = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('check_pipeline_share_requires_password', {
      _token: token,
    });

    if (error || !data) {
      setErrorMsg('This share link has expired or is invalid.');
      setViewState('error');
      return;
    }

    const result = data as { valid: boolean; requires_password?: boolean };
    if (!result.valid) {
      setErrorMsg('This share link has expired or is invalid.');
      setViewState('error');
      return;
    }

    if (result.requires_password) {
      setViewState('password_gate');
    } else {
      await loadAllData(null);
    }
  };

  // Step 2: Call the single SECURITY DEFINER RPC that returns everything
  // This replaces the broken direct anon queries to applications + candidate_profiles
  const loadAllData = async (password: string | null) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_pipeline_share_data', {
      _token: token,
      _password: password,
    });

    if (error || !data) {
      setErrorMsg('This share link has expired or is invalid.');
      setViewState('error');
      return;
    }

    const result = data as Record<string, unknown>;

    if (result.error === 'invalid_or_expired') {
      setErrorMsg('This share link has expired or is invalid.');
      setViewState('error');
      return;
    }

    if (result.error === 'too_many_attempts') {
      const retry = (result.retry_after as number) ?? 900;
      setRateLimitSeconds(retry);
      setPasswordError(
        `Too many incorrect attempts. Please wait ${Math.ceil(retry / 60)} minute(s) before trying again.`,
      );
      setSubmittingPassword(false);
      return;
    }

    if (result.error === 'invalid_password') {
      setPasswordError('Incorrect password. Please try again.');
      setSubmittingPassword(false);
      return;
    }

    // Success — parse everything returned from the RPC (server-side PII filtered)
    const shareMeta: ShareMeta = {
      job_id: result.job_id as string,
      expires_at: result.expires_at as string,
      is_password_protected: result.is_password_protected as boolean,
      show_candidate_names: result.show_candidate_names as boolean,
      show_candidate_emails: result.show_candidate_emails as boolean,
      show_candidate_linkedin: result.show_candidate_linkedin as boolean,
      show_salary_data: result.show_salary_data as boolean,
      show_match_scores: result.show_match_scores as boolean,
      show_ai_summary: result.show_ai_summary as boolean,
      show_contact_info: result.show_contact_info as boolean,
    };

    const jobPayload = result.job as Record<string, unknown>;
    const jobInfo: JobInfo = {
      title: jobPayload.title as string,
      pipeline_stages: (jobPayload.pipeline_stages as JobInfo['pipeline_stages']) ?? [
        { name: 'Applied', order: 0 },
        { name: 'Screening', order: 1 },
        { name: 'Interview', order: 2 },
        { name: 'Offer', order: 3 },
      ],
      company_name: jobPayload.company_name as string | undefined,
      company_logo_url: jobPayload.company_logo_url as string | undefined,
    };

    const apps = (result.applications as Application[]) ?? [];

    setMeta(shareMeta);
    setJob(jobInfo);
    setApplications(apps);
    setViewState('ready');
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) {
      setPasswordError('Please enter the password.');
      return;
    }
    if (rateLimitSeconds !== null) return;
    setSubmittingPassword(true);
    setPasswordError('');
    await loadAllData(passwordInput.trim());
    setSubmittingPassword(false);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (viewState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <SectionLoader />
          <p className="text-sm text-muted-foreground">{"Loading pipeline…"}</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (viewState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-6">
            <AlertCircle className="w-14 h-14 mx-auto text-destructive" />
            <div>
              <h2 className="text-xl font-bold mb-2">{t('sharedPipelineView.text2')}</h2>
              <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/auth')} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Sign in to The Quantum Club
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Password gate ────────────────────────────────────────────────────────
  if (viewState === 'password_gate') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-10 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold mb-1">{t('sharedPipelineView.text3')}</h2>
              <p className="text-sm text-muted-foreground">{t('sharedPipelineView.desc')}</p>
            </div>
            <div className="space-y-2 text-left">
              <Input
                type="password"
                placeholder={t('sharedPipelineView.text4')}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !submittingPassword && handlePasswordSubmit()}
                className="h-10"
                disabled={rateLimitSeconds !== null}
              />
              {passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={handlePasswordSubmit}
              disabled={submittingPassword || rateLimitSeconds !== null}
            >
              {submittingPassword ? 'Verifying…' : 'View Pipeline'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main shared view ──────────────────────────────────────────────────────
  if (!job || !meta) return null;

  const stages = Array.isArray(job.pipeline_stages) ? job.pipeline_stages : [
    { name: 'Applied', order: 0 },
    { name: 'Screening', order: 1 },
    { name: 'Interview', order: 2 },
    { name: 'Offer', order: 3 },
  ];

  const totalCandidates = applications.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Confidential banner */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 text-center">
        <p className="text-xs font-medium text-primary/80 tracking-wider uppercase">
          Confidential — View only · Shared by The Quantum Club
        </p>
      </div>

      {/* Header */}
      <header className="border-b border-border/30 bg-card/60 backdrop-blur-sm px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {job.company_logo_url && (
              <img
                src={job.company_logo_url}
                alt={job.company_name}
                className="w-12 h-12 rounded-xl object-cover border border-border/30"
              />
            )}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                {job.title}
              </h1>
              {job.company_name && (
                <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5" />
                  {job.company_name}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Read only
            </Badge>
            {meta.expires_at && (
              <span className="text-xs text-muted-foreground">
                Expires {format(new Date(meta.expires_at), 'dd MMM yyyy, HH:mm')}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => navigate('/auth')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Join The Quantum Club
            </Button>
          </div>
        </div>
      </header>

      {/* Pipeline board */}
      <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Pipeline · {totalCandidates} candidate{totalCandidates !== 1 ? 's' : ''}
          </h2>
        </div>

        {totalCandidates === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Eye className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">{t('sharedPipelineView.text5')}</p>
            <p className="text-xs text-muted-foreground/70">Check back later — candidates will appear here as they progress through the stages.</p>
          </div>
        ) : (
          <PipelineShareBoard stages={stages} applications={applications} visibility={meta} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by{' '}
          <span className="font-semibold text-foreground">{t('sharedPipelineView.text6')}</span>{' '}
          — executive talent, discreetly placed.
        </p>
      </footer>
    </div>
  );
}
