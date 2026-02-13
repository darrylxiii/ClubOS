import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSourcingMissions } from '@/hooks/useSourcingMissions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Zap, Copy, CheckCircle, AlertCircle, Clock, Users, Target } from 'lucide-react';
import { toast } from 'sonner';

interface StrategyQuery {
  label: string;
  query: string;
}

interface PlatformTip {
  platform: string;
  tip: string;
}

interface SourcingStrategy {
  linkedin_queries: StrategyQuery[];
  github_queries: StrategyQuery[];
  platform_tips: PlatformTip[];
  estimated_effort_hours: number;
  ideal_candidate_summary: string;
}

export default function SourcingCommandPanel() {
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [urlInput, setUrlInput] = useState('');
  const [strategy, setStrategy] = useState<SourcingStrategy | null>(null);
  const [importResults, setImportResults] = useState<Record<string, unknown> | null>(null);

  const { missions, isLoading: missionsLoading, generateStrategy, sourceCandidates, createMission } = useSourcingMissions(selectedJobId || undefined);

  // Fetch open jobs for selector
  const { data: jobs = [] } = useQuery({
    queryKey: ['open-jobs-sourcing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_id')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const handleGenerateStrategy = async () => {
    if (!selectedJobId) {
      toast.error('Select a job first');
      return;
    }
    const result = await generateStrategy.mutateAsync(selectedJobId);
    if (result?.strategy) {
      setStrategy(result.strategy);
      toast.success('Sourcing strategy generated');
    }
  };

  const handleImportUrls = async () => {
    if (!selectedJobId) {
      toast.error('Select a job first');
      return;
    }
    const urls = urlInput
      .split('\n')
      .map((u: string) => u.trim())
      .filter((u: string) => u.length > 0);

    if (urls.length === 0) {
      toast.error('Paste at least one LinkedIn URL');
      return;
    }

    // Create mission first
    const mission = await createMission.mutateAsync({
      jobId: selectedJobId,
      triggeredBy: 'manual',
      searchCriteria: { url_count: urls.length },
    });

    const result = await sourceCandidates.mutateAsync({
      jobId: selectedJobId,
      linkedinUrls: urls,
      missionId: mission.id,
    });

    setImportResults(result);
    setUrlInput('');
    toast.success(`Processed ${urls.length} URLs: ${result.new_profiles || 0} new profiles`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      default: return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Selector */}
      <Card className="bg-card/40 backdrop-blur-sm border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Sourcing Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="bg-card/30 border-border/30">
              <SelectValue placeholder="Select a role to source for" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedJobId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Strategy Generator */}
          <Card className="bg-card/40 backdrop-blur-sm border-border/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  AI Search Strategy
                </CardTitle>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleGenerateStrategy}
                  loading={generateStrategy.isPending}
                >
                  Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy ? (
                <>
                  <p className="text-xs text-muted-foreground">{strategy.ideal_candidate_summary}</p>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LinkedIn Boolean Queries</h4>
                    {strategy.linkedin_queries.map((q, i) => (
                      <div key={i} className="group relative bg-card/30 border border-border/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{q.label}</p>
                        <p className="text-sm font-mono break-all pr-8">{q.query}</p>
                        <button
                          onClick={() => copyToClipboard(q.query)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {strategy.github_queries.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GitHub Queries</h4>
                      {strategy.github_queries.map((q, i) => (
                        <div key={i} className="group relative bg-card/30 border border-border/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{q.label}</p>
                          <p className="text-sm font-mono break-all pr-8">{q.query}</p>
                          <button
                            onClick={() => copyToClipboard(q.query)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {strategy.platform_tips.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform Tips</h4>
                      {strategy.platform_tips.map((t, i) => (
                        <div key={i} className="bg-card/30 border border-border/20 rounded-lg p-3">
                          <span className="text-xs font-semibold text-primary">{t.platform}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.tip}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Estimated effort: <strong>{strategy.estimated_effort_hours}h</strong> for 20 qualified candidates
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Generate AI-powered Boolean search strings and platform-specific sourcing tips.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Bulk URL Import */}
          <Card className="bg-card/40 backdrop-blur-sm border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Bulk URL Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste LinkedIn URLs, one per line..."
                className="bg-card/30 border-border/30 min-h-[120px] font-mono text-xs"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {urlInput.split('\n').filter((u) => u.trim()).length} URLs ready
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleImportUrls}
                  loading={sourceCandidates.isPending || createMission.isPending}
                  disabled={!urlInput.trim()}
                >
                  Process URLs
                </Button>
              </div>

              {importResults && (
                <div className="bg-card/30 border border-border/20 rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider">Import Results</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Total: {(importResults as Record<string, number>).total_submitted}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                      <span>New: {(importResults as Record<string, number>).new_profiles}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-warning" />
                      <span>Duplicates: {(importResults as Record<string, number>).duplicates}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      <span>Invalid: {(importResults as Record<string, number>).invalid}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Missions */}
      {selectedJobId && (
        <Card className="bg-card/40 backdrop-blur-sm border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Sourcing Missions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missionsLoading ? (
              <p className="text-xs text-muted-foreground">Loading missions...</p>
            ) : missions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sourcing missions yet for this role.</p>
            ) : (
              <div className="space-y-3">
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className="bg-card/30 border border-border/20 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusColor(mission.status)} className="text-[10px]">
                          {mission.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {mission.triggered_by === 'manual' ? 'Manual import' : mission.triggered_by}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {mission.created_at ? new Date(mission.created_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{mission.profiles_found ?? 0} found</span>
                      <span>{mission.profiles_new ?? 0} new</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
