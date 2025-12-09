import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Languages, Download, Loader2, CheckCircle, AlertCircle, Sparkles, TrendingUp, BarChart3, RefreshCw, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSeedTranslations } from '@/hooks/use-seed-translations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/AppLayout';
import { ALL_NAMESPACES, SUPPORTED_LANGUAGES } from '@/i18n/config';

const TARGET_LANGUAGES = SUPPORTED_LANGUAGES.filter(l => l !== 'en');

export default function TranslationManager() {
  const queryClient = useQueryClient();
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingNamespace, setGeneratingNamespace] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  const seedTranslations = useSeedTranslations();
  const { data: coverageData, isLoading: coverageLoading } = useTranslationCoverage();

  // Fetch all namespaces from database
  const { data: dbNamespaces } = useQuery({
    queryKey: ['db-namespaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translations')
        .select('namespace')
        .eq('language', 'en')
        .eq('is_active', true);
      if (error) throw error;
      return [...new Set(data.map(t => t.namespace))];
    },
  });

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('language_config').select('*').eq('is_active', true).neq('code', 'en').order('code');
      if (error) throw error;
      return data;
    },
  });

  const { data: englishExists, isLoading: checkingEnglish } = useQuery({
    queryKey: ['english-translations-exist'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('translations')
        .select('*', { count: 'exact', head: true })
        .eq('language', 'en');
      if (error) throw error;
      return count !== null && count > 0;
    },
  });

  const { data: coverage, refetch: refetchCoverage } = useQuery({
    queryKey: ['translation-coverage'],
    queryFn: async () => {
      const { data, error } = await supabase.from('translations').select('namespace, language').eq('is_active', true);
      if (error) throw error;
      const coverageMap: Record<string, Record<string, boolean>> = {};
      data.forEach(t => {
        if (!coverageMap[t.namespace]) coverageMap[t.namespace] = {};
        coverageMap[t.namespace][t.language] = true;
      });
      return coverageMap;
    },
  });

  // Fetch stuck jobs
  const { data: stuckJobs, refetch: refetchJobs } = useQuery({
    queryKey: ['stuck-translation-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translation_generation_jobs')
        .select('*')
        .eq('status', 'running')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateForNamespace = async (namespace: string) => {
    if (!englishExists) {
      toast.error('Please seed English translations first');
      return;
    }
    
    setGeneratingNamespace(namespace);
    const loadingToast = toast.loading(`Generating translations for "${namespace}"...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-all-translations', { 
        body: { namespace } 
      });
      
      toast.dismiss(loadingToast);
      
      if (error) {
        toast.error(error.message || 'Translation failed');
        return;
      }
      
      if (data?.summary) {
        const { successCount, errorCount } = data.summary;
        if (errorCount > 0) {
          toast.warning(`Completed with ${errorCount} errors for "${namespace}"`);
        } else {
          toast.success(`✓ Generated ${successCount} translations for "${namespace}"`);
        }
      }
      
      refetchCoverage();
      refetchJobs();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Unexpected error');
    } finally {
      setGeneratingNamespace(null);
    }
  };

  const generateEverything = async () => {
    if (!englishExists) {
      toast.error('Please seed English translations first');
      return;
    }
    
    setIsGeneratingAll(true);
    const namespaceCount = dbNamespaces?.length || ALL_NAMESPACES.length;
    const loadingToast = toast.loading(`Generating ALL translations (${namespaceCount} namespaces × ${TARGET_LANGUAGES.length} languages)...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-all-translations', {
        body: { generateAll: true }
      });
      
      toast.dismiss(loadingToast);
      
      if (error) {
        toast.error(`Failed: ${error.message}`);
        return;
      }
      
      if (data?.summary) {
        const { successCount, errorCount, status } = data.summary;
        if (status === 'completed') {
          toast.success(`✓ Generated ${successCount} translations across all namespaces`);
        } else if (status === 'partial') {
          toast.warning(`Completed with ${errorCount} failures. ${successCount} succeeded.`);
        } else {
          toast.error(`Generation failed with ${errorCount} errors`);
        }
      }
      
      refetchCoverage();
      refetchJobs();
      queryClient.invalidateQueries({ queryKey: ['translation-coverage-analysis'] });
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const cleanupStuckJobs = async () => {
    if (!stuckJobs?.length) return;
    
    try {
      const { error } = await supabase
        .from('translation_generation_jobs')
        .update({ 
          status: 'failed', 
          error_message: 'Manually cleaned up - job was stuck',
          completed_at: new Date().toISOString()
        })
        .eq('status', 'running');
      
      if (error) throw error;
      
      toast.success(`Cleaned up ${stuckJobs.length} stuck jobs`);
      refetchJobs();
    } catch (error: any) {
      toast.error('Failed to cleanup jobs');
    }
  };

  const getCoverageForNamespace = (namespace: string) => {
    const ns = coverage?.[namespace] || {};
    const total = TARGET_LANGUAGES.length;
    const completed = TARGET_LANGUAGES.filter(lang => ns[lang])?.length || 0;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0, hasEnglish: !!ns['en'] };
  };

  const namespacesToShow = dbNamespaces || ALL_NAMESPACES;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-8">
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
            <Button onClick={generateEverything} disabled={isGeneratingAll || !englishExists} size="lg">
              {isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate ALL
            </Button>
          </div>
        </div>

        {!checkingEnglish && !englishExists && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Required</AlertTitle>
            <AlertDescription>
              Click "Seed English" to add English source translations before generating other languages.
            </AlertDescription>
          </Alert>
        )}

        {stuckJobs && stuckJobs.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{stuckJobs.length} Stuck Jobs Detected</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>These jobs appear to be stuck. Clean them up to continue.</span>
              <Button variant="outline" size="sm" onClick={cleanupStuckJobs}>
                <Trash2 className="h-4 w-4 mr-2" /> Clean Up
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate"><Sparkles className="h-4 w-4 mr-2" />Generate</TabsTrigger>
            <TabsTrigger value="coverage"><BarChart3 className="h-4 w-4 mr-2" />Coverage</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-6">
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
