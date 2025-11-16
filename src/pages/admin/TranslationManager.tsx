import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Languages, Download, Loader2, CheckCircle, AlertCircle, Sparkles, TrendingUp, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSeedTranslations } from '@/hooks/use-seed-translations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NAMESPACES = ['common', 'auth', 'onboarding'];

export default function TranslationManager() {
  const queryClient = useQueryClient();
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAutomatedSetup, setIsAutomatedSetup] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const seedTranslations = useSeedTranslations();
  const { data: coverageData, isLoading: coverageLoading } = useTranslationCoverage();

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

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('translation-onboarding-seen');
    if (!checkingEnglish && englishExists === false && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [checkingEnglish, englishExists]);

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

  const generateAllForNamespace = async (namespace: string) => {
    if (!englishExists) {
      toast.error('Please seed English translations first');
      return;
    }
    
    setIsGeneratingAll(true);
    const loadingToast = toast.loading('Starting translation generation...');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-all-translations', { body: { namespace } });
      
      toast.dismiss(loadingToast);
      
      if (error) {
        toast.error(error.message || 'Translation failed');
        console.error('[TranslationManager] Error:', error);
        return;
      }
      
      if (data?.summary) {
        toast.success(`Generated ${data.summary.success}/${data.summary.total} translations for "${namespace}"`, { duration: 4000 });
      }
      
      refetchCoverage();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Unexpected error');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const generateEverything = async () => {
    if (!englishExists) {
      toast.error('Please seed English translations first');
      return;
    }
    
    setIsBulkGenerating(true);
    const loadingToast = toast.loading('Generating all translations...');
    
    try {
      for (let i = 0; i < NAMESPACES.length; i++) {
        const namespace = NAMESPACES[i];
        await supabase.functions.invoke('generate-all-translations', { body: { namespace } });
        if (i < NAMESPACES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      toast.dismiss(loadingToast);
      toast.success('🎉 All translations generated!', { duration: 8000 });
      refetchCoverage();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error generating all translations:', error);
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleAutomatedSetup = async () => {
    localStorage.setItem('translation-onboarding-seen', 'true');
    setShowOnboarding(false);
    setIsAutomatedSetup(true);
    
    try {
      toast.info('Step 1/2: Seeding English translations...');
      await seedTranslations.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['english-translations-exist'] });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.info('Step 2/2: Generating all languages...');
      await generateEverything();
      
      toast.success('🎉 Setup complete!');
    } catch (error) {
      console.error('[Automated Setup] Error:', error);
    } finally {
      setIsAutomatedSetup(false);
    }
  };

  const getCoverageForNamespace = (namespace: string) => {
    const ns = coverage?.[namespace] || {};
    const total = languages?.length || 0;
    const completed = languages?.filter(lang => ns[lang.code])?.length || 0;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><Languages className="h-5 w-5 inline mr-2" />Translation Manager</DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>Set up multilingual support in 30 seconds.</p>
              <div className="space-y-2">
                <p><strong>1.</strong> Seed English baseline (2s)</p>
                <p><strong>2.</strong> Generate 7 languages (4 min)</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { localStorage.setItem('translation-onboarding-seen', 'true'); setShowOnboarding(false); }}>Skip</Button>
            <Button onClick={handleAutomatedSetup} disabled={isAutomatedSetup}>
              {isAutomatedSetup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Start Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Translation Manager</h1>
          <p className="text-muted-foreground mt-2">Automated AI translation system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedTranslations.mutate()} disabled={seedTranslations.isPending}>
            {seedTranslations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Seed English
          </Button>
          <Button onClick={generateEverything} disabled={isBulkGenerating || !englishExists} size="lg">
            {isBulkGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate ALL
          </Button>
        </div>
      </div>

      {!checkingEnglish && !englishExists && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Setup Required</AlertTitle>
          <AlertDescription>
            <Button onClick={() => seedTranslations.mutate()} disabled={seedTranslations.isPending} size="sm" className="mt-2">
              {seedTranslations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Seed English Now
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
          <div className="grid gap-4 md:grid-cols-3">
            {NAMESPACES.map((namespace) => {
              const { completed, total, percentage } = getCoverageForNamespace(namespace);
              return (
                <Card key={namespace}>
                  <CardHeader className="pb-3">
                    <CardTitle className="capitalize flex items-center justify-between">
                      {namespace}
                      {percentage === 100 && <CheckCircle className="h-4 w-4 text-green-500" />}
                    </CardTitle>
                    <CardDescription>{completed}/{total} languages</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={percentage} />
                    <Button onClick={() => generateAllForNamespace(namespace)} disabled={isGeneratingAll || !englishExists} size="sm" className="w-full">
                      {isGeneratingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                      Generate
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
                        <span>All complete!</span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {coverageData.missingKeys.map((missing, idx) => (
                          <div key={idx} className="flex justify-between p-2 rounded bg-muted/50">
                            <div>
                              <p className="text-sm font-medium">{missing.namespace}</p>
                              <p className="text-xs text-muted-foreground">{missing.language}</p>
                            </div>
                            <Badge variant="destructive">{missing.missingCount}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No data</p></CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
