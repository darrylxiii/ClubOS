import { useEffect, useState } from 'react';
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
  requires_password: boolean;
}

interface JobData {
  title: string;
  pipeline_stages: { name: string; order: number; color?: string }[];
  companies?: { name: string; logo_url?: string };
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
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);

  // Step 1: On mount, check if the link is valid and whether it needs a password
  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid share link.');
      setViewState('error');
      return;
    }
    checkToken();
  }, [token]);

  const checkToken = async () => {
    const { data, error } = await supabase.rpc('check_pipeline_share_requires_password' as any, {
      _token: token,
    });

    if (error || !data) {
      setErrorMsg('This share link has expired or is invalid.');
      setViewState('error');
      return;
    }

    const result = data as any;
    if (!result.valid) {
      setErrorMsg('This share link has expired or is invalid.');
      setViewState('error');
      return;
    }

    if (result.requires_password) {
      setViewState('password_gate');
    } else {
      // No password required — validate directly
      await validateAndLoad(null);
    }
  };

  const validateAndLoad = async (password: string | null) => {
    const { data, error } = await supabase.rpc('validate_job_pipeline_share' as any, {
      _token: token,
      _password: password,
    });

    if (error || !data) {
      setErrorMsg('This share link has expired or is invalid.');
      setViewState('error');
      return;
    }

    const result = data as any;

    if (result.error === 'invalid_password') {
      setPasswordError('Incorrect password. Please try again.');
      setSubmittingPassword(false);
      return;
    }

    const shareMeta: ShareMeta = {
      job_id: result.job_id,
      expires_at: result.expires_at,
      requires_password: result.requires_password ?? false,
      show_candidate_names: result.show_candidate_names,
      show_candidate_emails: result.show_candidate_emails,
      show_candidate_linkedin: result.show_candidate_linkedin,
      show_salary_data: result.show_salary_data,
      show_match_scores: result.show_match_scores,
      show_ai_summary: result.show_ai_summary,
      show_contact_info: result.show_contact_info,
    };

    setMeta(shareMeta);
    await fetchPipelineData(shareMeta);
    setViewState('ready');
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) {
      setPasswordError('Please enter the password.');
      return;
    }
    setSubmittingPassword(true);
    setPasswordError('');
    await validateAndLoad(passwordInput.trim());
    setSubmittingPassword(false);
  };

  const fetchPipelineData = async (shareMeta: ShareMeta) => {
    // Fetch job
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('title, pipeline_stages, companies(name, logo_url)')
      .eq('id', shareMeta.job_id)
      .single();

    if (jobError || !jobData) return;
    setJob(jobData as unknown as JobData);

    // Fetch applications with candidate data
    const { data: apps, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        current_stage_index,
        applied_at,
        match_score,
        ai_summary,
        candidate_id,
        user_id
      `)
      .eq('job_id', shareMeta.job_id)
      .neq('status', 'rejected');

    if (appsError || !apps) return;

    // Batch-fetch candidate profiles
    const candidateIds = apps
      .map((a: any) => a.candidate_id)
      .filter(Boolean) as string[];

    const candidateProfilesMap = new Map<string, any>();

    if (candidateIds.length > 0) {
      const { data: profiles } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, current_title, current_company, email, linkedin_url')
        .in('id', candidateIds);

      (profiles || []).forEach((p: any) => candidateProfilesMap.set(p.id, p));
    }

    const enriched: Application[] = apps.map((app: any) => {
      const cp = candidateProfilesMap.get(app.candidate_id);
      return {
        id: app.id,
        current_stage_index: app.current_stage_index ?? 0,
        applied_at: app.applied_at,
        match_score: app.match_score,
        ai_summary: app.ai_summary,
        full_name: cp?.full_name || 'Candidate',
        current_title: cp?.current_title,
        current_company: cp?.current_company,
        email: shareMeta.show_candidate_emails ? cp?.email : undefined,
        linkedin_url: shareMeta.show_candidate_linkedin ? cp?.linkedin_url : undefined,
      };
    });

    setApplications(enriched);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (viewState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <SectionLoader />
          <p className="text-sm text-muted-foreground">Loading pipeline…</p>
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
              <h2 className="text-xl font-bold mb-2">Link unavailable</h2>
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
              <h2 className="text-lg font-bold mb-1">Password required</h2>
              <p className="text-sm text-muted-foreground">
                This pipeline is protected. Enter the password to view it.
              </p>
            </div>
            <div className="space-y-2 text-left">
              <Input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                className="h-10"
              />
              {passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={handlePasswordSubmit}
              disabled={submittingPassword}
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

  const stages = Array.isArray(job.pipeline_stages)
    ? job.pipeline_stages
    : [
        { name: 'Applied', order: 0 },
        { name: 'Screening', order: 1 },
        { name: 'Interview', order: 2 },
        { name: 'Offer', order: 3 },
      ];

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
            {(job.companies as any)?.logo_url && (
              <img
                src={(job.companies as any).logo_url}
                alt={(job.companies as any)?.name}
                className="w-12 h-12 rounded-xl object-cover border border-border/30"
              />
            )}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                {job.title}
              </h1>
              {(job.companies as any)?.name && (
                <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5" />
                  {(job.companies as any).name}
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
            Pipeline · {applications.length} candidate{applications.length !== 1 ? 's' : ''}
          </h2>
        </div>

        <PipelineShareBoard
          stages={stages}
          applications={applications}
          visibility={meta}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by{' '}
          <span className="font-semibold text-foreground">The Quantum Club</span>{' '}
          — executive talent, discreetly placed.
        </p>
      </footer>
    </div>
  );
}
