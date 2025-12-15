import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Languages, Download, Loader2, CheckCircle, AlertCircle, Sparkles, TrendingUp, BarChart3, RefreshCw, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSeedTranslations } from '@/hooks/use-seed-translations';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/AppLayout';
import { ALL_NAMESPACES, SUPPORTED_LANGUAGES } from '@/i18n/config';
import { TranslationLoadingState, QueryState } from '@/components/translations/TranslationLoadingState';
import { TranslationDebugPanel, LogEntry } from '@/components/translations/TranslationDebugPanel';
import { TranslationJobProgress } from '@/components/translations/TranslationJobProgress';

const TARGET_LANGUAGES = SUPPORTED_LANGUAGES.filter(l => l !== 'en');

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
import { AppLayout } from '@/components/AppLayout';
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

  // Auto-cleanup stale jobs on page load
  useEffect(() => {
    const cleanupStaleJobs = async () => {
      const { data, error } = await supabase
        .from('translation_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Job timed out and was cleaned up automatically',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'running')
        .lt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .select();

      if (data && data.length > 0) {
        addLog('warn', `Auto-cleaned ${data.length} stale jobs`, undefined, 'cleanup');
      }
    };

    cleanupStaleJobs();
  }, []);

  const cleanupStuckJobs = async () => {
    setIsCleaningJobs(true);
    addLog('info', 'Cleaning up stuck jobs...', undefined, 'cleanup');

    try {
      const { data, error } = await supabase
        .from('translation_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Job timed out and was cleaned up manually',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'running')
        .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        addLog('info', `✓ Cleaned up ${data.length} stuck jobs`, undefined, 'cleanup');
        toast.success(`Cleaned up ${data.length} stuck jobs`);
        queryClient.invalidateQueries({ queryKey: ['translation-jobs'] });
      } else {
        addLog('info', 'No stuck jobs found', undefined, 'cleanup');
        toast.info('No stuck jobs to clean up');
      }
    } catch (error: any) {
      addLog('error', 'Cleanup failed', error.message, 'cleanup');
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setIsCleaningJobs(false);
    }
  };

  // Helper to add logs
  const addLog = useCallback((level: 'info' | 'warn' | 'error', message: string, details?: string, source?: string) => {
    const id = `log-${++logIdRef.current}`;
    setLogs(prev => [...prev.slice(-50), { id, level, message, details, timestamp: new Date(), source }]);
  }, []);

  // Fetch namespaces with timing
  const namespacesQuery = useQuery({
    queryKey: ['db-namespaces'],
    queryFn: async () => {
      const start = Date.now();
      addLog('info', 'Fetching namespaces...', undefined, 'namespaces');
      const { data, error } = await supabase
        .from('translations')
        .select('namespace')
        .eq('language', 'en')
        .eq('is_active', true);

      if (error) {
        addLog('error', 'Failed to fetch namespaces', error.message, 'namespaces');
        throw error;
      }

      const namespaces = [...new Set(data.map(t => t.namespace))];
      addLog('info', `Loaded ${namespaces.length} namespaces`, `Duration: ${Date.now() - start}ms`, 'namespaces');
      return { namespaces, duration: Date.now() - start };
    },
  });

  // Fetch languages
  const languagesQuery = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const start = Date.now();
      addLog('info', 'Fetching languages...', undefined, 'languages');
      const { data, error } = await supabase
        .from('language_config')
        .select('*')
        .eq('is_active', true)
        .neq('code', 'en')
        .order('code');

      if (error) {
        addLog('error', 'Failed to fetch languages', error.message, 'languages');
        throw error;
      }

      addLog('info', `Loaded ${data.length} languages`, `Duration: ${Date.now() - start}ms`, 'languages');
      return { languages: data, duration: Date.now() - start };
    },
  });

  // Check English exists
  const englishQuery = useQuery({
    queryKey: ['english-translations-exist'],
    queryFn: async () => {
      const start = Date.now();
      addLog('info', 'Checking English translations...', undefined, 'english');
      const { count, error } = await supabase
        .from('translations')
        .select('*', { count: 'exact', head: true })
        .eq('language', 'en');

      if (error) {
        addLog('error', 'Failed to check English', error.message, 'english');
        throw error;
      }

      const exists = count !== null && count > 0;
      addLog(exists ? 'info' : 'warn',
        exists ? `Found ${count} English translations` : 'No English translations found',
        `Duration: ${Date.now() - start}ms`, 'english');
      return { exists, count, duration: Date.now() - start };
    },
  });

  // Coverage query
  const coverageQuery = useQuery({
    queryKey: ['translation-coverage'],
    queryFn: async () => {
      const start = Date.now();
      addLog('info', 'Calculating coverage...', undefined, 'coverage');
      const { data, error } = await supabase
        .from('translations')
        .select('namespace, language')
        .eq('is_active', true);

      if (error) {
        addLog('error', 'Failed to fetch coverage', error.message, 'coverage');
        throw error;
      }

      const coverageMap: Record<string, Record<string, boolean>> = {};
      data.forEach(t => {
        if (!coverageMap[t.namespace]) coverageMap[t.namespace] = {};
        coverageMap[t.namespace][t.language] = true;
      });

      addLog('info', `Coverage calculated for ${Object.keys(coverageMap).length} namespaces`,
        `Duration: ${Date.now() - start}ms`, 'coverage');
      return { coverageMap, duration: Date.now() - start };
    },
  });

  // Build query states for loading indicator
  const queryStates: QueryState[] = [
    {
      label: 'Namespaces',
      status: namespacesQuery.isLoading ? 'loading' : namespacesQuery.isError ? 'error' : 'success',
      count: namespacesQuery.data?.namespaces?.length,
      error: namespacesQuery.error?.message,
      duration: namespacesQuery.data?.duration,
    },
    {
      label: 'Languages',
      status: languagesQuery.isLoading ? 'loading' : languagesQuery.isError ? 'error' : 'success',
      count: languagesQuery.data?.languages?.length,
      error: languagesQuery.error?.message,
      duration: languagesQuery.data?.duration,
    },
    {
      label: 'English Source',
      status: englishQuery.isLoading ? 'loading' : englishQuery.isError ? 'error' : 'success',
      count: englishQuery.data?.count || undefined,
      error: englishQuery.error?.message,
      duration: englishQuery.data?.duration,
    },
    {
      label: 'Coverage',
      status: coverageQuery.isLoading ? 'loading' : coverageQuery.isError ? 'error' : 'success',
      count: coverageQuery.data ? Object.keys(coverageQuery.data.coverageMap).length : undefined,
      error: coverageQuery.error?.message,
      duration: coverageQuery.data?.duration,
    },
  ];

  const handleRetryQuery = (label: string) => {
    switch (label) {
      case 'Namespaces':
        queryClient.invalidateQueries({ queryKey: ['db-namespaces'] });
        break;
      case 'Languages':
        queryClient.invalidateQueries({ queryKey: ['languages'] });
        break;
      case 'English Source':
        queryClient.invalidateQueries({ queryKey: ['english-translations-exist'] });
        break;
      case 'Coverage':
        queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
        break;
    }
  };

  const generateForNamespace = async (namespace: string) => {
    if (!englishQuery.data?.exists) {
      toast.error('Please seed English translations first');
      return;
    }

    setGeneratingNamespace(namespace);
    addLog('info', `Starting translation for "${namespace}"...`, undefined, 'generate');

    try {
      const { data, error } = await supabase.functions.invoke('generate-all-translations', {
        body: { namespace }
      });

      if (error) {
        addLog('error', `Translation failed for "${namespace}"`, error.message, 'generate');
        toast.error(error.message || 'Translation failed');
        return;
      }

      if (data?.summary) {
        const { successCount, errorCount } = data.summary;
        if (errorCount > 0) {
          addLog('warn', `Completed with ${errorCount} errors`, JSON.stringify(data.errors, null, 2), 'generate');
          toast.warning(`Completed with ${errorCount} errors for "${namespace}"`);
        } else {
          addLog('info', `✓ Generated ${successCount} translations for "${namespace}"`, undefined, 'generate');
          toast.success(`✓ Generated ${successCount} translations for "${namespace}"`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
    } catch (error: any) {
      addLog('error', 'Unexpected error', error.message, 'generate');
      toast.error(error.message || 'Unexpected error');
    } finally {
      setGeneratingNamespace(null);
    }
  };

  const generateEverything = async () => {
    if (!englishQuery.data?.exists) {
      toast.error('Please seed English translations first');
      return;
    }

    setIsGeneratingAll(true);
    const namespaceCount = namespacesQuery.data?.namespaces?.length || ALL_NAMESPACES.length;
    addLog('info', `Starting full generation (${namespaceCount} namespaces × ${TARGET_LANGUAGES.length} languages)...`, undefined, 'generate');

    try {
      const { data, error } = await supabase.functions.invoke('generate-all-translations', {
        body: { generateAll: true }
      });

      if (error) {
        addLog('error', 'Full generation failed', error.message, 'generate');
        toast.error(`Failed: ${error.message}`);
        return;
      }

      if (data?.summary) {
        const { successCount, errorCount, status, jobId } = data.summary;
        addLog('info', `Generation complete: ${status}`,
          `Success: ${successCount}, Errors: ${errorCount}, Job: ${jobId}`, 'generate');

        if (status === 'completed') {
          toast.success(`✓ Generated ${successCount} translations across all namespaces`);
        } else if (status === 'partial') {
          toast.warning(`Completed with ${errorCount} failures. ${successCount} succeeded.`);
        } else {
          toast.error(`Generation failed with ${errorCount} errors`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['translation-coverage-analysis'] });
    } catch (error: any) {
      addLog('error', 'Fatal error during generation', error.message, 'generate');
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleJobComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
    queryClient.invalidateQueries({ queryKey: ['translation-coverage-analysis'] });
    refetchCoverage();
  };

  const syncMissingKeys = async () => {
    setIsSyncingKeys(true);
    addLog('info', 'Syncing missing translation keys...', undefined, 'sync');

    try {
      const { data, error } = await supabase.functions.invoke('sync-translation-keys', {
        body: { mode: 'detect' }
      });

      if (error) {
        addLog('error', 'Sync failed', error.message, 'sync');
        toast.error(`Sync failed: ${error.message}`);
        return;
      }

      const { summary, results } = data;
      const incompleteCount = summary?.incompleteTranslations || 0;

      if (incompleteCount > 0) {
        addLog('warn', `Found ${incompleteCount} incomplete translations`,
          JSON.stringify(results.filter((r: any) => r.status !== 'complete').slice(0, 5), null, 2), 'sync');

        // Now trigger generation for missing keys
        addLog('info', 'Triggering translation for missing keys...', undefined, 'sync');

        const { error: genError } = await supabase.functions.invoke('generate-all-translations', {
          body: { generateAll: true }
        });

        if (genError) {
          addLog('error', 'Generation failed after sync', genError.message, 'sync');
          toast.error(`Generation failed: ${genError.message}`);
        } else {
          addLog('info', '✓ Translation sync complete', undefined, 'sync');
          toast.success(`Synced translations for ${incompleteCount} language/namespace combinations`);
        }
      } else {
        addLog('info', '✓ All translations are complete', undefined, 'sync');
        toast.success('All translations are already synced!');
      }

      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
      refetchCoverage();
    } catch (error: any) {
      addLog('error', 'Sync error', error.message, 'sync');
      toast.error(error.message);
    } finally {
      setIsSyncingKeys(false);
    }
  };

  const getCoverageForNamespace = (namespace: string) => {
    const ns = coverageQuery.data?.coverageMap?.[namespace] || {};
    const total = TARGET_LANGUAGES.length;
    const completed = TARGET_LANGUAGES.filter(lang => ns[lang])?.length || 0;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0, hasEnglish: !!ns['en'] };
  };

  const namespacesToShow = namespacesQuery.data?.namespaces || ALL_NAMESPACES;
  const isAnyLoading = queryStates.some(q => q.status === 'loading');
  const hasEnglish = englishQuery.data?.exists;
  const overallCompletion = coverageData?.overallCompletion || 0;

  // New Status Card Component for Overview
  const StatusCard = ({ title, status, description, action, variant = "default" }: any) => (
    <Card className={`border-l-4 ${status === 'success' ? 'border-l-green-500' : status === 'warning' ? 'border-l-yellow-500' : 'border-l-gray-300'}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {status === 'success' ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : status === 'warning' ? (
            <AlertCircle className="h-6 w-6 text-yellow-500" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted" />
          )}
        </div>
        {action}
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-8 max-w-6xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Translation Center</h1>
          <p className="text-xl text-muted-foreground">
            Manage your application's global reach from one place.
          </p>
        </div>

        {/* --- MAIN ACTION AREA --- */}
        <div className="grid gap-6 md:grid-cols-3">

          {/* Step 1: English Source */}
          <StatusCard
            title="1. Source Content"
            status={hasEnglish ? 'success' : 'warning'}
            description="English is the master language. We need to load it into the database first."
            action={
              <Button
                onClick={() => seedTranslations.mutate()}
                disabled={seedTranslations.isPending || hasEnglish}
                className="w-full"
                variant={hasEnglish ? "outline" : "default"}
              >
                {seedTranslations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : hasEnglish ? <CheckCircle className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                {hasEnglish ? "English Loaded" : "Load English Source"}
              </Button>
            }
          />

          {/* Step 2: Sync & Generate */}
          <StatusCard
            title="2. AI Translation"
            status={overallCompletion === 100 ? 'success' : 'warning'}
            description="Automatically generate translations for all supported languages using AI."
            action={
              <Button
                onClick={generateEverything}
                disabled={isGeneratingAll || !hasEnglish || isAnyLoading}
                className="w-full relative overflow-hidden group"
                variant={overallCompletion === 100 ? "outline" : "default"}
              >
                {isGeneratingAll && (
                  <div className="absolute inset-0 bg-primary/10 animate-progress" />
                )}
                <div className="relative flex items-center justify-center">
                  {isGeneratingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {overallCompletion === 100 ? "Regenerate All" : "Auto-Translate Everything"}
                </div>
              </Button>
            }
          />

          {/* Step 3: Status Overview */}
          <StatusCard
            title="3. Global Status"
            status={overallCompletion > 90 ? 'success' : 'warning'}
            description={`${overallCompletion}% of your content is translated across ${TARGET_LANGUAGES.length} languages.`}
            action={
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span className="font-medium">{overallCompletion}%</span>
                </div>
                <Progress value={overallCompletion} className="h-2" />
              </div>
            }
          />
        </div>

        {/* --- TABS SECTION --- */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b bg-muted/30">
            <TabsList>
              <TabsTrigger value="overview"><Globe className="h-4 w-4 mr-2" />Detailed Overview</TabsTrigger>
              <TabsTrigger value="details"><Languages className="h-4 w-4 mr-2" />Namespace Details</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6 m-0">
            {/* Overall Health Chart */}
            <div className="grid gap-8 md:grid-cols-2">
              <div className='space-y-6'>
                <h3 className="text-lg font-semibold flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-primary" /> Language Health</h3>
                {coverageLoading ? <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div> : (
                  <div className="space-y-4">
                    {Object.entries(coverageData?.byLanguage || {}).map(([lang, data]: any) => (
                      <div key={lang} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium uppercase flex items-center gap-2">
                            {lang === 'en' ? '🇬🇧' : <span className="bg-muted px-1.5 rounded textxs">{lang}</span>}
                            {lang === 'en' ? 'English (Source)' : lang}
                          </span>
                          <span className={data.percentage < 100 ? "text-yellow-600 font-bold" : "text-green-600 font-bold"}>
                            {data.percentage}%
                          </span>
                        </div>
                        <Progress value={data.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className='bg-muted/30 p-6 rounded-lg border'>
                <h3 className="text-lg font-semibold flex items-center mb-4"><AlertCircle className="mr-2 h-5 w-5 text-primary" /> Action Items</h3>
                {!hasEnglish ? (
                  <div className="flex gap-4 items-start text-sm">
                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-700 mt-0.5">1</div>
                    <div>
                      <p className="font-medium">Missing Source Content</p>
                      <p className="text-muted-foreground mt-1">Run "Load English Source" to initialize the database.</p>
                    </div>
                  </div>
                ) : coverageData?.missingKeys?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start text-sm">
                      <div className="bg-blue-100 p-2 rounded-full text-blue-700 mt-0.5">1</div>
                      <div>
                        <p className="font-medium">{coverageData.missingKeys.length} Missing Translations</p>
                        <p className="text-muted-foreground mt-1">Some recent keys haven't been translated yet.</p>
                        <Button size="sm" variant="secondary" onClick={syncMissingKeys} className="mt-2 h-8" disabled={isSyncingKeys}>
                          {isSyncingKeys ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                          Fix Automatically
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <p className="font-medium">Everything looks good!</p>
                    <p className="text-sm text-muted-foreground">Your translations are up to date.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="p-6 m-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {namespacesToShow.map((namespace) => {
                const { completed, total, percentage, hasEnglish } = getCoverageForNamespace(namespace);
                const isGenerating = generatingNamespace === namespace;

                return (
                  <Card key={namespace} className={`shadow-sm hover:shadow-md transition-shadow ${!hasEnglish ? 'opacity-60 bg-muted/50' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="capitalize text-base font-semibold">{namespace}</CardTitle>
                        {percentage === 100 && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                      <CardDescription className="text-xs">
                        Namespace
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex justify-between text-xs mb-2">
                        <span>{completed} / {total} langs</span>
                        <span>{Math.round(percentage)}%</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button
                        onClick={() => generateForNamespace(namespace)}
                        disabled={isGenerating || isGeneratingAll || !hasEnglish}
                        size="sm"
                        variant="ghost"
                        className="w-full h-8 text-xs ml-auto"
                      >
                        {isGenerating ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                        {percentage === 100 ? 'Regenerate' : 'Translate'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* --- ADVANCED SECTION (Collapsed) --- */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="border rounded-lg bg-muted/20">
          <CollapsibleTrigger className="flex items-center gap-2 p-4 w-full text-sm font-medium hover:bg-muted/50 transition-colors">
            {showAdvanced ? <ArrowRight className="h-4 w-4 rotate-90 transition-transform" /> : <ArrowRight className="h-4 w-4 transition-transform" />}
            <Settings2 className="h-4 w-4" />
            Advanced & Logs
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 border-t space-y-4">
            {/* Loading State Indicator */}
            <div className="bg-card p-4 rounded border">
              <TranslationLoadingState queries={queryStates} onRetry={handleRetryQuery} />
            </div>

            {/* Job Progress */}
            <TranslationJobProgress onJobComplete={handleJobComplete} onCleanup={cleanupStuckJobs} />

            {/* Raw Logs */}
            <TranslationDebugPanel logs={logs} onClear={() => setLogs([])} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </AppLayout>
  );
}
