import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Languages, Download, Loader2, CheckCircle, AlertCircle, Sparkles, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
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

export default function TranslationManager() {
  const queryClient = useQueryClient();
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingNamespace, setGeneratingNamespace] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const seedTranslations = useSeedTranslations();
  const { data: coverageData, isLoading: coverageLoading } = useTranslationCoverage();

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
  };

  const getCoverageForNamespace = (namespace: string) => {
    const ns = coverageQuery.data?.coverageMap?.[namespace] || {};
    const total = TARGET_LANGUAGES.length;
    const completed = TARGET_LANGUAGES.filter(lang => ns[lang])?.length || 0;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0, hasEnglish: !!ns['en'] };
  };

  const namespacesToShow = namespacesQuery.data?.namespaces || ALL_NAMESPACES;
  const isAnyLoading = queryStates.some(q => q.status === 'loading');

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Translation Manager</h1>
            <p className="text-muted-foreground mt-2">
              Enterprise AI translation system • {namespacesToShow.length} namespaces • {TARGET_LANGUAGES.length} languages
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => seedTranslations.mutate()} disabled={seedTranslations.isPending}>
              {seedTranslations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Seed English
            </Button>
            <Button onClick={generateEverything} disabled={isGeneratingAll || !englishQuery.data?.exists || isAnyLoading} size="lg">
              {isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate ALL
            </Button>
          </div>
        </div>

        {/* Loading State Indicator */}
        <TranslationLoadingState queries={queryStates} onRetry={handleRetryQuery} />

        {/* Job Progress (Real-time) */}
        <TranslationJobProgress onJobComplete={handleJobComplete} />

        {/* Debug Panel */}
        <TranslationDebugPanel logs={logs} onClear={() => setLogs([])} />

        {!englishQuery.isLoading && !englishQuery.data?.exists && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Required</AlertTitle>
            <AlertDescription>
              Click "Seed English" to add English source translations before generating other languages.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate"><Sparkles className="h-4 w-4 mr-2" />Generate</TabsTrigger>
            <TabsTrigger value="coverage"><BarChart3 className="h-4 w-4 mr-2" />Coverage</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-6">
            {isAnyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {namespacesToShow.map((namespace) => {
                  const { completed, total, percentage, hasEnglish } = getCoverageForNamespace(namespace);
                  const isGenerating = generatingNamespace === namespace;
                  
                  return (
                    <Card key={namespace} className={!hasEnglish ? 'opacity-60' : ''}>
                      <CardHeader className="pb-3">
                        <CardTitle className="capitalize flex items-center justify-between text-base">
                          {namespace}
                          {percentage === 100 && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </CardTitle>
                        <CardDescription>
                          {hasEnglish ? `${completed}/${total} languages` : 'No English source'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Progress value={percentage} className="h-2" />
                        <Button 
                          onClick={() => generateForNamespace(namespace)} 
                          disabled={isGenerating || isGeneratingAll || !hasEnglish} 
                          size="sm" 
                          className="w-full"
                          variant={percentage === 100 ? 'outline' : 'default'}
                        >
                          {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : percentage === 100 ? (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          ) : (
                            <Languages className="mr-2 h-4 w-4" />
                          )}
                          {percentage === 100 ? 'Regenerate' : 'Generate'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4 mt-6">
            {coverageLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : coverageData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle><TrendingUp className="h-5 w-5 inline mr-2" />Overall Coverage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-3xl font-bold">{coverageData.overallCompletion}%</p>
                      <Badge variant={coverageData.overallCompletion === 100 ? 'default' : 'secondary'}>
                        {coverageData.overallCompletion === 100 ? 'Complete' : 'In Progress'}
                      </Badge>
                    </div>
                    <Progress value={coverageData.overallCompletion} className="h-3" />
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle>By Language</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(coverageData.byLanguage).map(([lang, data]) => (
                        <div key={lang} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium uppercase">{lang}</span>
                            <span className="text-muted-foreground">{data.percentage}%</span>
                          </div>
                          <Progress value={data.percentage} className="h-2" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Missing Translations</CardTitle></CardHeader>
                    <CardContent>
                      {coverageData.missingKeys.length === 0 ? (
                        <div className="flex items-center gap-2 text-green-600 py-4">
                          <CheckCircle className="h-5 w-5" />
                          <span>All translations complete!</span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {coverageData.missingKeys.slice(0, 20).map((missing, idx) => (
                            <div key={idx} className="flex justify-between p-2 rounded bg-muted/50">
                              <div>
                                <p className="text-sm font-medium">{missing.namespace}</p>
                                <p className="text-xs text-muted-foreground uppercase">{missing.language}</p>
                              </div>
                              <Badge variant="destructive">{missing.missingCount} keys</Badge>
                            </div>
                          ))}
                          {coverageData.missingKeys.length > 20 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              +{coverageData.missingKeys.length - 20} more...
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No translation data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
