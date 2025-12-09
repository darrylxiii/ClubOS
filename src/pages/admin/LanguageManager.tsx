import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Globe, Check, X, Loader2, Languages, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/AppLayout";
import { ALL_NAMESPACES } from "@/i18n/config";

const popularLanguages = [
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Swedish', native: 'Svenska', flag: '🇸🇪' },
];

export default function LanguageManager() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState({
    code: '',
    name: '',
    nativeName: '',
    flagEmoji: '',
    isRtl: false,
    fontFamily: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch active languages
  const { data: languages, isLoading } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_config')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all namespaces with translations
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

  // Fetch translation coverage per language
  const { data: coverage, refetch: refetchCoverage } = useQuery({
    queryKey: ['translation-coverage-detailed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translations')
        .select('namespace, language')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const coverageMap: Record<string, Set<string>> = {};
      data.forEach(t => {
        if (!coverageMap[t.language]) {
          coverageMap[t.language] = new Set();
        }
        coverageMap[t.language].add(t.namespace);
      });
      
      return coverageMap;
    },
  });

  const totalNamespaces = dbNamespaces?.length || ALL_NAMESPACES.length;

  // Add language mutation
  const addLanguageMutation = useMutation({
    mutationFn: async (language: typeof newLanguage & { autoGenerate: boolean }) => {
      const { error: configError } = await supabase
        .from('language_config')
        .insert({
          code: language.code,
          name: language.name,
          native_name: language.nativeName,
          flag_emoji: language.flagEmoji,
          is_rtl: language.isRtl,
          font_family: language.fontFamily || null,
        });

      if (configError) throw configError;

      if (language.autoGenerate) {
        setIsGenerating(true);
        const { data, error: genError } = await supabase.functions.invoke(
          'generate-all-translations',
          { body: { generateAll: true } }
        );

        if (genError) {
          console.error('Generation error:', genError);
          throw new Error('Language added but translation generation failed');
        }

        return data;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.invalidateQueries({ queryKey: ['translation-coverage-detailed'] });
      setIsAddDialogOpen(false);
      setIsGenerating(false);
      setNewLanguage({
        code: '',
        name: '',
        nativeName: '',
        flagEmoji: '',
        isRtl: false,
        fontFamily: '',
      });
      toast.success('Language added successfully');
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(error instanceof Error ? error.message : 'Failed to add language');
    },
  });

  const handleQuickAdd = async (lang: typeof popularLanguages[0]) => {
    await addLanguageMutation.mutateAsync({
      code: lang.code,
      name: lang.name,
      nativeName: lang.native,
      flagEmoji: lang.flag,
      isRtl: false,
      fontFamily: '',
      autoGenerate: true,
    });
  };

  const getCoverage = (langCode: string) => {
    const namespaces = coverage?.[langCode];
    if (!namespaces) return { count: 0, total: totalNamespaces, percentage: 0 };
    return { 
      count: namespaces.size, 
      total: totalNamespaces,
      percentage: Math.round((namespaces.size / totalNamespaces) * 100)
    };
  };

  const isComplete = (langCode: string) => {
    const { count, total } = getCoverage(langCode);
    return count >= total;
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Language Management</h1>
            <p className="text-muted-foreground mt-2">
              {languages?.length || 0} languages • {totalNamespaces} namespaces
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchCoverage()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Language
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Language</DialogTitle>
                  <DialogDescription>
                    Add a new language and optionally auto-generate translations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Language Code</Label>
                      <Input
                        id="code"
                        placeholder="e.g., it, pt"
                        value={newLanguage.code}
                        onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flag">Flag Emoji</Label>
                      <Input
                        id="flag"
                        placeholder="🇮🇹"
                        value={newLanguage.flagEmoji}
                        onChange={(e) => setNewLanguage({ ...newLanguage, flagEmoji: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">English Name</Label>
                    <Input
                      id="name"
                      placeholder="Italian"
                      value={newLanguage.name}
                      onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nativeName">Native Name</Label>
                    <Input
                      id="nativeName"
                      placeholder="Italiano"
                      value={newLanguage.nativeName}
                      onChange={(e) => setNewLanguage({ ...newLanguage, nativeName: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rtl"
                      checked={newLanguage.isRtl}
                      onCheckedChange={(checked) => setNewLanguage({ ...newLanguage, isRtl: checked })}
                    />
                    <Label htmlFor="rtl">Right-to-Left (RTL)</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => addLanguageMutation.mutate({ ...newLanguage, autoGenerate: false })}
                    disabled={!newLanguage.code || !newLanguage.name || isGenerating}
                  >
                    Add Only
                  </Button>
                  <Button
                    onClick={() => addLanguageMutation.mutate({ ...newLanguage, autoGenerate: true })}
                    disabled={!newLanguage.code || !newLanguage.name || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Add + Generate'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Quick Add Popular Languages
            </CardTitle>
            <CardDescription>
              One-click addition with automatic AI translation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popularLanguages.map((lang) => {
                const alreadyExists = languages?.some(l => l.code === lang.code);
                return (
                  <Button
                    key={lang.code}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdd(lang)}
                    disabled={alreadyExists || isGenerating}
                  >
                    {lang.flag} {lang.name}
                    {alreadyExists && <Check className="ml-2 h-3 w-3 text-green-500" />}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Active Languages
            </CardTitle>
            <CardDescription>
              Translation coverage across {totalNamespaces} namespaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {languages?.map((lang) => {
                  const { count, total, percentage } = getCoverage(lang.code);
                  const complete = isComplete(lang.code);
                  
                  return (
                    <div
                      key={lang.code}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{lang.flag_emoji}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{lang.name}</span>
                            <span className="text-sm text-muted-foreground">
                              ({lang.native_name})
                            </span>
                            {lang.code === 'en' && (
                              <Badge variant="secondary">Source</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {lang.code.toUpperCase()}
                            {lang.is_rtl && ' • RTL'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {count}/{total} namespaces
                            </span>
                            {complete ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <span className="text-sm text-muted-foreground">{percentage}%</span>
                            )}
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
