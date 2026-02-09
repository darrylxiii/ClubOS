import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Languages, Download, Loader2, CheckCircle, AlertCircle, Sparkles, TrendingUp, BarChart3, RefreshCw, Trash2, ArrowRight, Settings2, Globe } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSeedTranslations } from '@/hooks/use-seed-translations';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ALL_NAMESPACES, SUPPORTED_LANGUAGES } from '@/i18n/config';
import { TranslationLoadingState, QueryState } from '@/components/translations/TranslationLoadingState';
import { TranslationDebugPanel, LogEntry } from '@/components/translations/TranslationDebugPanel';
import { TranslationJobProgress } from '@/components/translations/TranslationJobProgress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const TARGET_LANGUAGES = SUPPORTED_LANGUAGES.filter(l => l !== 'en');

export default function TranslationManager() {
  const queryClient = useQueryClient();
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isSyncingKeys, setIsSyncingKeys] = useState(false);
  const [generatingNamespace, setGeneratingNamespace] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCleaningJobs, setIsCleaningJobs] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const logIdRef = useRef(0);
  const seedTranslations = useSeedTranslations();
  const { data: coverageData, isLoading: coverageLoading, refetch: refetchCoverage } = useTranslationCoverage();

  const addLog = useCallback((level: 'info' | 'warn' | 'error', message: string, details?: string, source?: string) => {
    const id = `log-${++logIdRef.current}`;
    setLogs(prev => [...prev.slice(-50), { id, level, message, details, timestamp: new Date(), source }]);
  }, []);

  useEffect(() => {
    const cleanupStaleJobs = async () => {
      const { data } = await supabase.from('translation_generation_jobs').update({ status: 'failed', error_message: 'Job timed out and was cleaned up automatically', updated_at: new Date().toISOString() }).eq('status', 'running').lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()).select();
      if (data && data.length > 0) addLog('warn', `Auto-cleaned ${data.length} stale jobs`, undefined, 'cleanup');
    };
    cleanupStaleJobs();
    const interval = setInterval(cleanupStaleJobs, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [addLog]);

  const cleanupStuckJobs = async () => {
    setIsCleaningJobs(true);
    addLog('info', 'Cleaning up stuck jobs...', undefined, 'cleanup');
    try {
      const { data, error } = await supabase.from('translation_generation_jobs').update({ status: 'failed', error_message: 'Job timed out and was cleaned up manually', updated_at: new Date().toISOString() }).eq('status', 'running').lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()).select();
      if (error) throw error;
      if (data && data.length > 0) { addLog('info', `✓ Cleaned up ${data.length} stuck jobs`, undefined, 'cleanup'); toast.success(`Cleaned up ${data.length} stuck jobs`); queryClient.invalidateQueries({ queryKey: ['translation-jobs'] }); } 
      else { addLog('info', 'No stuck jobs found', undefined, 'cleanup'); toast.info('No stuck jobs to clean up'); }
    } catch (error: any) { addLog('error', 'Cleanup failed', error.message, 'cleanup'); toast.error(`Cleanup failed: ${error.message}`); } finally { setIsCleaningJobs(false); }
  };

  const namespacesQuery = useQuery({
    queryKey: ['db-namespaces'],
    queryFn: async () => {
      const start = Date.now(); addLog('info', 'Fetching namespaces...', undefined, 'namespaces');
      const { data, error } = await supabase.from('translations').select('namespace').eq('language', 'en').eq('is_active', true);
      if (error) { addLog('error', 'Failed to fetch namespaces', error.message, 'namespaces'); throw error; }
      const namespaces = [...new Set(data.map(t => t.namespace))]; addLog('info', `Loaded ${namespaces.length} namespaces`, `Duration: ${Date.now() - start}ms`, 'namespaces');
      return { namespaces, duration: Date.now() - start };
    }, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  const languagesQuery = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const start = Date.now(); addLog('info', 'Fetching languages...', undefined, 'languages');
      const { data, error } = await supabase.from('language_config').select('*').eq('is_active', true).neq('code', 'en').order('code');
      if (error) { addLog('error', 'Failed to fetch languages', error.message, 'languages'); throw error; }
      addLog('info', `Loaded ${data.length} languages`, `Duration: ${Date.now() - start}ms`, 'languages');
      return { languages: data, duration: Date.now() - start };
    }, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  const englishQuery = useQuery({
    queryKey: ['english-translations-exist'],
    queryFn: async () => {
      const start = Date.now(); addLog('info', 'Checking English translations...', undefined, 'english');
      const { count, error } = await supabase.from('translations').select('*', { count: 'exact', head: true }).eq('language', 'en');
      if (error) { addLog('error', 'Failed to check English', error.message, 'english'); throw error; }
      const exists = count !== null && count > 0; addLog(exists ? 'info' : 'warn', exists ? `Found ${count} English translations` : 'No English translations found', `Duration: ${Date.now() - start}ms`, 'english');
      return { exists, count, duration: Date.now() - start };
    }, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  const coverageQuery = useQuery({
    queryKey: ['translation-coverage'],
    queryFn: async () => {
      const start = Date.now(); addLog('info', 'Calculating coverage...', undefined, 'coverage');
      const { data, error } = await supabase.from('translations').select('namespace, language').eq('is_active', true);
      if (error) { addLog('error', 'Failed to fetch coverage', error.message, 'coverage'); throw error; }
      const coverageMap: Record<string, Record<string, boolean>> = {};
      data.forEach(t => { if (!coverageMap[t.namespace]) coverageMap[t.namespace] = {}; coverageMap[t.namespace][t.language] = true; });
      addLog('info', `Coverage calculated for ${Object.keys(coverageMap).length} namespaces`, `Duration: ${Date.now() - start}ms`, 'coverage');
      return { coverageMap, duration: Date.now() - start };
    }, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });

  const queryStates: QueryState[] = [
    { label: 'Namespaces', status: namespacesQuery.isLoading ? 'loading' : namespacesQuery.isError ? 'error' : 'success', count: namespacesQuery.data?.namespaces?.length, error: namespacesQuery.error?.message, duration: namespacesQuery.data?.duration },
    { label: 'Languages', status: languagesQuery.isLoading ? 'loading' : languagesQuery.isError ? 'error' : 'success', count: languagesQuery.data?.languages?.length, error: languagesQuery.error?.message, duration: languagesQuery.data?.duration },
    { label: 'English Source', status: englishQuery.isLoading ? 'loading' : englishQuery.isError ? 'error' : 'success', count: englishQuery.data?.count || undefined, error: englishQuery.error?.message, duration: englishQuery.data?.duration },
    { label: 'Coverage', status: coverageQuery.isLoading ? 'loading' : coverageQuery.isError ? 'error' : 'success', count: coverageQuery.data ? Object.keys(coverageQuery.data.coverageMap).length : undefined, error: coverageQuery.error?.message, duration: coverageQuery.data?.duration },
  ];

  const handleRetryQuery = (label: string) => {
    switch (label) {
      case 'Namespaces': queryClient.invalidateQueries({ queryKey: ['db-namespaces'] }); break;
      case 'Languages': queryClient.invalidateQueries({ queryKey: ['languages'] }); break;
      case 'English Source': queryClient.invalidateQueries({ queryKey: ['english-translations-exist'] }); break;
      case 'Coverage': queryClient.invalidateQueries({ queryKey: ['translation-coverage'] }); break;
    }
  };

  const generateForNamespace = async (namespace: string) => {
    if (!englishQuery.data?.exists) { toast.error('Please seed English translations first'); return; }
    const { data: runningJobs } = await supabase.from('translation_generation_jobs').select('id').eq('status', 'running').gt('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()).limit(1);
    if (runningJobs && runningJobs.length > 0) { addLog('warn', 'A translation job is already running', undefined, 'generate'); toast.warning('A translation job is already running. Please wait for it to complete.'); return; }
    setGeneratingNamespace(namespace); addLog('info', `Starting translation for "${namespace}"...`, undefined, 'generate');
    try {
      const { data, error } = await supabase.functions.invoke('generate-all-translations', { body: { namespace } });
      if (error) { if (error.message?.includes('already running')) { addLog('warn', 'Job already in progress', error.message, 'generate'); toast.info('A translation job is already in progress.'); return; } addLog('error', `Translation failed for "${namespace}"`, error.message, 'generate'); toast.error(error.message || 'Translation failed'); return; }
      if (data?.error?.includes('already running')) { addLog('warn', 'Job already in progress', `Existing job: ${data.existingJobId}`, 'generate'); toast.info('A translation job is already in progress.'); return; }
      if (data?.jobId) { addLog('info', `Translation job started for "${namespace}"`, `Job ID: ${data.jobId}`, 'generate'); toast.success(`Translation job started for "${namespace}"!`); } 
      else if (data?.summary) { const { successCount, errorCount } = data.summary; if (errorCount > 0) { addLog('warn', `Completed with ${errorCount} errors`, JSON.stringify(data.errors, null, 2), 'generate'); toast.warning(`Completed with ${errorCount} errors for "${namespace}"`); } else { addLog('info', `✓ Generated ${successCount} translations for "${namespace}"`, undefined, 'generate'); toast.success(`✓ Generated ${successCount} translations for "${namespace}"`); } }
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
    } catch (error: any) { addLog('error', 'Unexpected error', error.message, 'generate'); toast.error(error.message || 'Unexpected error'); } finally { setGeneratingNamespace(null); }
  };

  const generateEverything = async () => {
    if (!englishQuery.data?.exists) { toast.error('Please seed English translations first'); return; }
    const { data: runningJobs } = await supabase.from('translation_generation_jobs').select('id, started_at').eq('status', 'running').gt('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()).limit(1);
    if (runningJobs && runningJobs.length > 0) { addLog('warn', 'A translation job is already running', `Job ID: ${runningJobs[0].id}`, 'generate'); toast.warning('A translation job is already running. Please wait for it to complete.'); return; }
    setIsGeneratingAll(true); const namespaceCount = namespacesQuery.data?.namespaces?.length || ALL_NAMESPACES.length; addLog('info', `Starting full generation (${namespaceCount} namespaces × ${TARGET_LANGUAGES.length} languages)...`, undefined, 'generate');
    try {
      const { data, error } = await supabase.functions.invoke('generate-all-translations', { body: { generateAll: true } });
      if (error) { if (error.message?.includes('already running') || error.message?.includes('409')) { addLog('warn', 'Job already in progress', error.message, 'generate'); toast.info('A translation job is already in progress. Check the Active Jobs panel.'); return; } addLog('error', 'Full generation failed', error.message, 'generate'); toast.error(`Failed: ${error.message}`); return; }
      if (data?.error?.includes('already running')) { addLog('warn', 'Job already in progress', `Existing job: ${data.existingJobId}`, 'generate'); toast.info('A translation job is already in progress. Check the Active Jobs panel.'); return; }
      if (data?.jobId) { addLog('info', 'Translation job started', `Job ID: ${data.jobId}`, 'generate'); toast.success('Translation job started! Check the progress below.'); } 
      else if (data?.summary) { const { successCount, errorCount, status, jobId } = data.summary; addLog('info', `Generation complete: ${status}`, `Success: ${successCount}, Errors: ${errorCount}, Job: ${jobId}`, 'generate'); if (status === 'completed') { toast.success(`✓ Generated ${successCount} translations across all namespaces`); } else if (status === 'partial') { toast.warning(`Completed with ${errorCount} failures. ${successCount} succeeded.`); } else { toast.error(`Generation failed with ${errorCount} errors`); } }
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] }); queryClient.invalidateQueries({ queryKey: ['translation-coverage-analysis'] });
    } catch (error: any) { addLog('error', 'Fatal error during generation', error.message, 'generate'); toast.error(`Error: ${error.message}`); } finally { setIsGeneratingAll(false); }
  };

  const handleJobComplete = () => { queryClient.invalidateQueries({ queryKey: ['translation-coverage'] }); queryClient.invalidateQueries({ queryKey: ['translation-coverage-analysis'] }); refetchCoverage(); };

  const syncMissingKeys = async () => {
    setIsSyncingKeys(true); addLog('info', 'Syncing missing translation keys...', undefined, 'sync');
    try {
      const { data, error } = await supabase.functions.invoke('sync-translation-keys', { body: { mode: 'detect' } });
      if (error) { addLog('error', 'Sync failed', error.message, 'sync'); toast.error(`Sync failed: ${error.message}`); return; }
      const { summary, results } = data; const incompleteCount = summary?.incompleteTranslations || 0;
      if (incompleteCount > 0) {
        addLog('warn', `Found ${incompleteCount} incomplete translations`, JSON.stringify(results.filter((r: any) => r.status !== 'complete').slice(0, 5), null, 2), 'sync'); addLog('info', 'Triggering translation for missing keys...', undefined, 'sync');
        const { error: genError } = await supabase.functions.invoke('generate-all-translations', { body: { generateAll: true } });
        if (genError) { addLog('error', 'Generation failed after sync', genError.message, 'sync'); toast.error(`Generation failed: ${genError.message}`); } else { addLog('info', '✓ Translation sync complete', undefined, 'sync'); toast.success(`Synced translations for ${incompleteCount} language/namespace combinations`); }
      } else { addLog('info', '✓ All translations are complete', undefined, 'sync'); toast.success('All translations are already synced!'); }
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] }); refetchCoverage();
    } catch (error: any) { addLog('error', 'Sync error', error.message, 'sync'); toast.error(error.message); } finally { setIsSyncingKeys(false); }
  };

  const getCoverageForNamespace = (namespace: string) => {
    const ns = coverageQuery.data?.coverageMap?.[namespace] || {}; const total = TARGET_LANGUAGES.length; const completed = TARGET_LANGUAGES.filter(lang => ns[lang])?.length || 0;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0, hasEnglish: !!ns['en'] };
  };

  const namespacesToShow = namespacesQuery.data?.namespaces || ALL_NAMESPACES;
  const isAnyLoading = queryStates.some(q => q.status === 'loading');
  const hasEnglish = englishQuery.data?.exists;
  const overallCompletion = coverageData?.overallCompletion || 0;

  const StatusCard = ({ title, status, description, action, variant = "default" }: any) => (
    <Card className={`border-l-4 ${status === 'success' ? 'border-l-green-500' : status === 'warning' ? 'border-l-yellow-500' : 'border-l-gray-300'}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div><h3 className="font-semibold text-lg">{title}</h3><p className="text-sm text-muted-foreground mt-1">{description}</p></div>
          {status === 'success' ? <CheckCircle className="h-6 w-6 text-green-500" /> : status === 'warning' ? <AlertCircle className="h-6 w-6 text-yellow-500" /> : <div className="h-6 w-6 rounded-full bg-muted" />}
        </div>
        {action && <Button onClick={action.onClick} variant="outline" size="sm" className="w-full">{action.label}</Button>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Globe className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Translation Manager</h1><p className="text-muted-foreground">Manage translations across all languages</p></div></div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ['db-namespaces'] }); queryClient.invalidateQueries({ queryKey: ['languages'] }); queryClient.invalidateQueries({ queryKey: ['english-translations-exist'] }); queryClient.invalidateQueries({ queryKey: ['translation-coverage'] }); }}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button></div>
      </div>

      {isAnyLoading && <TranslationLoadingState queries={queryStates} onRetry={handleRetryQuery} />}

      {!isAnyLoading && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="namespaces">Namespaces</TabsTrigger><TabsTrigger value="jobs">Active Jobs</TabsTrigger><TabsTrigger value="debug">Debug</TabsTrigger></TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Translation Coverage</CardTitle><CardDescription>Overall progress: {overallCompletion.toFixed(1)}% complete</CardDescription></CardHeader>
              <CardContent>
                <Progress value={overallCompletion} className="h-3" />
                <div className="mt-4 grid grid-cols-3 gap-4 text-center"><div><p className="text-2xl font-bold">{namespacesToShow.length}</p><p className="text-xs text-muted-foreground">Namespaces</p></div><div><p className="text-2xl font-bold">{TARGET_LANGUAGES.length}</p><p className="text-xs text-muted-foreground">Languages</p></div><div><p className="text-2xl font-bold">{englishQuery.data?.count || 0}</p><p className="text-xs text-muted-foreground">English Keys</p></div></div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button onClick={generateEverything} disabled={isGeneratingAll || !hasEnglish} className="flex-1">{isGeneratingAll ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate All Translations</>}</Button>
                <Button onClick={syncMissingKeys} disabled={isSyncingKeys} variant="outline">{isSyncingKeys ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatusCard title="English Source" status={hasEnglish ? 'success' : 'warning'} description={hasEnglish ? `${englishQuery.data?.count} keys loaded` : 'No English keys found'} action={!hasEnglish ? { label: 'Seed English', onClick: () => seedTranslations.mutate() } : undefined} />
              <StatusCard title="Namespaces" status="success" description={`${namespacesToShow.length} namespaces configured`} />
              <StatusCard title="Languages" status="success" description={`${TARGET_LANGUAGES.length} target languages`} />
            </div>
          </TabsContent>

          <TabsContent value="namespaces" className="space-y-4">
            {namespacesToShow.map((ns) => {
              const coverage = getCoverageForNamespace(ns);
              return (
                <Card key={ns}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1"><p className="font-medium">{ns}</p><div className="flex items-center gap-2 mt-2"><Progress value={coverage.percentage} className="h-2 flex-1" /><span className="text-xs text-muted-foreground w-16">{coverage.completed}/{coverage.total}</span></div></div>
                      <Button variant="outline" size="sm" onClick={() => generateForNamespace(ns)} disabled={generatingNamespace === ns || !hasEnglish} className="ml-4">{generatingNamespace === ns ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" />Generate</>}</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="jobs"><TranslationJobProgress onJobComplete={handleJobComplete} /></TabsContent>

          <TabsContent value="debug" className="space-y-4">
            <TranslationDebugPanel logs={logs} onClear={() => setLogs([])} />
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild><Button variant="outline" className="w-full"><Settings2 className="h-4 w-4 mr-2" />Advanced Options</Button></CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <Card><CardHeader><CardTitle className="text-base">Cleanup</CardTitle></CardHeader><CardContent className="flex gap-2"><Button variant="outline" size="sm" onClick={cleanupStuckJobs} disabled={isCleaningJobs}>{isCleaningJobs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}Cleanup Stuck Jobs</Button></CardContent></Card>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
