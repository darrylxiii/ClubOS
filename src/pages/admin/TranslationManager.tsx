import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Languages, Download, Loader2, CheckCircle, AlertCircle, Sparkles, RefreshCw, Clock, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSeedTranslations } from '@/hooks/use-seed-translations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NAMESPACES = ['common', 'auth', 'onboarding'];

export default function TranslationManager() {
  const queryClient = useQueryClient();
  const [selectedNamespace, setSelectedNamespace] = useState('common');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentLang: '' });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAutomatedSetup, setIsAutomatedSetup] = useState(false);
  const seedTranslations = useSeedTranslations();

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

  // Show onboarding modal on first visit if no English translations
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
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again in 2-3 minutes.', { duration: 6000 });
        } else if (error.message?.includes('Payment') || error.message?.includes('402')) {
          toast.error('Translation credits depleted. Please add more credits to continue.', { duration: 6000 });
        } else if (error.message?.includes('English source not found')) {
          toast.error('No English source found. Please click "Seed English" first.');
        } else if (error.message?.includes('LOVABLE_API_KEY')) {
          toast.error('AI key not configured. Contact admin.');
        } else {
          toast.error(error.message || 'Failed to generate translations');
        }
        throw error;
      }
      
      const { summary, results, errors: apiErrors } = data;
      const failedLanguages = results.filter((r: any) => r.status === 'error');
      
      if (summary.errorCount === 0) {
        toast.success(
          `✓ Generated ${summary.successCount} translations in ${summary.totalTimeSeconds}s! Cost: $${summary.totalCost.toFixed(2)}`,
          { duration: 5000 }
        );
      } else if (summary.successCount > 0) {
        const rateLimitFailed = failedLanguages.some((r: any) => r.errorType === 'RATE_LIMIT');
        const paymentFailed = failedLanguages.some((r: any) => r.errorType === 'PAYMENT_REQUIRED');
        
        if (rateLimitFailed) {
          toast.warning(
            `⚠️ Partial success: ${summary.successCount} completed, ${summary.errorCount} stopped due to rate limits. Please retry in 2-3 minutes.`,
            { duration: 8000 }
          );
        } else if (paymentFailed) {
          toast.warning(
            `⚠️ Partial success: ${summary.successCount} completed, ${summary.errorCount} stopped due to depleted credits. Please add credits and retry.`,
            { duration: 8000 }
          );
        } else {
          toast.warning(
            `⚠️ Partial success: ${summary.successCount} completed, ${summary.errorCount} failed. Check console for details.`,
            { duration: 6000 }
          );
        }
        
        console.error('Failed languages:', failedLanguages);
      } else {
        toast.error(`All translations failed. ${apiErrors?.[0]?.error || 'Unknown error'}`);
        console.error('Translation errors:', apiErrors);
      }
      
      refetchCoverage();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error generating translations:', error);
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
    setBulkProgress({ current: 0, total: NAMESPACES.length * 7, currentLang: 'Starting...' });
    const loadingToast = toast.loading('Generating all translations (2-3 minutes with rate limit protection)...');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-all-translations', { body: { generateAll: true } });
      
      toast.dismiss(loadingToast);
      
      if (error) {
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again in 2-3 minutes.', { duration: 6000 });
        } else if (error.message?.includes('Payment') || error.message?.includes('402')) {
          toast.error('Translation credits depleted. Please add more credits to continue.', { duration: 6000 });
        } else if (error.message?.includes('English source not found')) {
          toast.error('No English source found. Please click "Seed English" first.');
        } else if (error.message?.includes('LOVABLE_API_KEY')) {
          toast.error('AI key not configured. Contact admin.');
        } else {
          toast.error(error.message || 'Failed to generate translations');
        }
        throw error;
      }
      
      const { summary, results, errors: apiErrors } = data;
      const failedJobs = results.filter((r: any) => r.status === 'error');
      
      if (summary.errorCount === 0) {
        toast.success(
          `✓ All translations generated! ${summary.successCount} languages in ${summary.totalTimeSeconds}s. Cost: $${summary.totalCost.toFixed(2)}`,
          { duration: 6000 }
        );
      } else if (summary.successCount > 0) {
        const rateLimitFailed = failedJobs.some((r: any) => r.errorType === 'RATE_LIMIT');
        const paymentFailed = failedJobs.some((r: any) => r.errorType === 'PAYMENT_REQUIRED');
        
        if (rateLimitFailed) {
          toast.warning(
            `⚠️ Partial success: ${summary.successCount}/${summary.successCount + summary.errorCount} completed. Rate limit hit - retry "Generate ALL" in 2-3 minutes to complete remaining translations.`,
            { duration: 10000 }
          );
        } else if (paymentFailed) {
          toast.warning(
            `⚠️ Partial success: ${summary.successCount}/${summary.successCount + summary.errorCount} completed. Credits depleted - add more and retry "Generate ALL".`,
            { duration: 10000 }
          );
        } else {
          toast.warning(
            `⚠️ Partial success: ${summary.successCount}/${summary.successCount + summary.errorCount} completed. Check console for errors.`,
            { duration: 8000 }
          );
        }
        
        console.error('Failed translation jobs:', failedJobs);
        console.error('API errors:', apiErrors);
      } else {
        toast.error(`All translations failed. ${apiErrors?.[0]?.error || 'Unknown error'}`, { duration: 6000 });
        console.error('Translation errors:', apiErrors);
      }
      
      refetchCoverage();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error generating all translations:', error);
    } finally {
      setIsBulkGenerating(false);
      setBulkProgress({ current: 0, total: 0, currentLang: '' });
    }
  };

  const handleAutomatedSetup = async () => {
    localStorage.setItem('translation-onboarding-seen', 'true');
    setShowOnboarding(false);
    setIsAutomatedSetup(true);
    
    try {
      // Step 1: Seed English
      toast.info('Step 1/2: Seeding English translations...');
      await seedTranslations.mutateAsync();
      
      // Wait for query to update
      await queryClient.invalidateQueries({ queryKey: ['english-translations-exist'] });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Generate all languages
      toast.info('Step 2/2: Generating all languages...');
      await generateEverything();
      
      toast.success('🎉 Setup complete! All 8 languages are ready.');
    } catch (error) {
      console.error('[Automated Setup] Error:', error);
    } finally {
      setIsAutomatedSetup(false);
    }
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('translation-onboarding-seen', 'true');
    setShowOnboarding(false);
  };

  const getCoverageForNamespace = (namespace: string) => {
    const ns = coverage?.[namespace] || {};
    const total = languages?.length || 0;
    const completed = languages?.filter(lang => ns[lang.code])?.length || 0;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Onboarding Modal */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Welcome to Translation Manager! 🌍
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>To get started with automated translations:</p>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-foreground">Seed English Baseline</p>
                    <p className="text-sm">Loads 209 English strings into database (~2 seconds)</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-foreground">Generate All Languages</p>
                    <p className="text-sm">Auto-translates to 7 languages: NL, DE, FR, ES, ZH, AR, RU (~30 seconds, ~$0.90)</p>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSkipOnboarding}>
              Skip, I'll do it manually
            </Button>
            <Button onClick={handleAutomatedSetup} disabled={isAutomatedSetup}>
              {isAutomatedSetup ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Start Automated Setup</>
              )}
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
          <Button 
            variant="outline" 
            onClick={() => seedTranslations.mutate()} 
            disabled={seedTranslations.isPending}
          >
            {seedTranslations.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Seed English
          </Button>
          <Button 
            onClick={generateEverything} 
            disabled={isBulkGenerating || !englishExists || checkingEnglish}
            size="lg"
            title={!englishExists ? 'Please seed English translations first' : ''}
          >
            {isBulkGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Generate ALL</>
            )}
          </Button>
        </div>
      </div>

      {/* Workflow Guidance Alert */}
      {!checkingEnglish && !englishExists && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Setup Required</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>English translations must be seeded before generating other languages.</p>
            <Button 
              onClick={() => seedTranslations.mutate()} 
              disabled={seedTranslations.isPending}
              size="sm"
            >
              {seedTranslations.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Seeding...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" />Seed English Now</>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                <Button 
                  onClick={() => generateAllForNamespace(namespace)} 
                  disabled={isGeneratingAll || !englishExists || checkingEnglish} 
                  size="sm" 
                  className="w-full"
                  title={!englishExists ? 'Please seed English translations first' : ''}
                >
                  {isGeneratingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}