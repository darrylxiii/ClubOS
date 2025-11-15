import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Languages, Download, Loader2, CheckCircle, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSeedTranslations } from '@/hooks/use-seed-translations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const NAMESPACES = ['common', 'auth', 'onboarding'];

export default function TranslationManager() {
  const queryClient = useQueryClient();
  const [selectedNamespace, setSelectedNamespace] = useState('common');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentLang: '' });
  const seedTranslations = useSeedTranslations();

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('language_config').select('*').eq('is_active', true).neq('code', 'en').order('code');
      if (error) throw error;
      return data;
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

  const generateAllForNamespace = async (namespace: string) => {
    setIsGeneratingAll(true);
    try {
      toast.info(`Generating translations for ${namespace}...`);
      const { data, error } = await supabase.functions.invoke('generate-all-translations', { body: { namespace } });
      if (error) throw error;
      toast.success(`Generated ${data.summary.successCount} translations! Cost: $${data.summary.totalCost}`);
      refetchCoverage();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate translations');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const generateEverything = async () => {
    setIsBulkGenerating(true);
    try {
      toast.info('Generating ALL translations...');
      const { data, error } = await supabase.functions.invoke('generate-all-translations', { body: { generateAll: true } });
      if (error) throw error;
      toast.success(`Generated all! Cost: $${data.summary.totalCost}`);
      refetchCoverage();
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    } finally {
      setIsBulkGenerating(false);
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
          <Button onClick={generateEverything} disabled={isBulkGenerating} size="lg">
            {isBulkGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate ALL</>}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {NAMESPACES.map((namespace) => {
          const { completed, total, percentage } = getCoverageForNamespace(namespace);
          return (
            <Card key={namespace}>
              <CardHeader className="pb-3">
                <CardTitle className="capitalize">{namespace}</CardTitle>
                <CardDescription>{completed}/{total} languages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={percentage} />
                <Button onClick={() => generateAllForNamespace(namespace)} disabled={isGeneratingAll} size="sm" className="w-full">
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