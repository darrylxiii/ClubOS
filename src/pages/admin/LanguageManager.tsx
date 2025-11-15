import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Globe, Check, X, Loader2, Languages } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  // Fetch translation coverage
  const { data: coverage } = useQuery({
    queryKey: ['translation-coverage'],
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

  // Add language mutation
  const addLanguageMutation = useMutation({
    mutationFn: async (language: typeof newLanguage & { autoGenerate: boolean }) => {
      // First, add to language_config
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

      // If auto-generate is enabled, trigger translation generation
      if (language.autoGenerate) {
        setIsGenerating(true);
        const { data, error: genError } = await supabase.functions.invoke(
          'generate-all-translations',
          {
            body: { generateAll: true }
          }
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
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
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

  // Quick add language
  const handleQuickAdd = async (lang: typeof popularLanguages[0]) => {
    setNewLanguage({
      code: lang.code,
      name: lang.name,
      nativeName: lang.native,
      flagEmoji: lang.flag,
      isRtl: false,
      fontFamily: '',
    });
    
    // Trigger auto-generation
    await addLanguageMutation.mutateAsync({
      ...newLanguage,
      code: lang.code,
      name: lang.name,
      nativeName: lang.native,
      flagEmoji: lang.flag,
      autoGenerate: true,
    });
  };

  const getCoverage = (langCode: string) => {
    const namespaces = coverage?.[langCode];
    if (!namespaces) return { count: 0, total: 3 };
    return { count: namespaces.size, total: 3 };
  };

  const isComplete = (langCode: string) => {
    const { count, total } = getCoverage(langCode);
    return count === total;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Language Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage supported languages and translation coverage
          </p>
        </div>
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
                Add a new language and optionally auto-generate translations (~$0.90)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Language Code (ISO 639-1)</Label>
                <Input
                  id="code"
                  placeholder="e.g., it, pt, ja"
                  value={newLanguage.code}
                  onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">English Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Italian, Portuguese"
                  value={newLanguage.name}
                  onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nativeName">Native Name</Label>
                <Input
                  id="nativeName"
                  placeholder="e.g., Italiano, Português"
                  value={newLanguage.nativeName}
                  onChange={(e) => setNewLanguage({ ...newLanguage, nativeName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag">Flag Emoji</Label>
                <Input
                  id="flag"
                  placeholder="e.g., 🇮🇹, 🇵🇹"
                  value={newLanguage.flagEmoji}
                  onChange={(e) => setNewLanguage({ ...newLanguage, flagEmoji: e.target.value })}
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
              <div className="space-y-2">
                <Label htmlFor="font">Font Family (Optional)</Label>
                <Input
                  id="font"
                  placeholder="e.g., Noto Sans JP"
                  value={newLanguage.fontFamily}
                  onChange={(e) => setNewLanguage({ ...newLanguage, fontFamily: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => addLanguageMutation.mutate({ ...newLanguage, autoGenerate: false })}
                disabled={!newLanguage.code || !newLanguage.name || isGenerating}
              >
                Add Without Translations
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
                  'Add + Auto-Generate'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Quick Add Popular Languages
          </CardTitle>
          <CardDescription>
            One-click addition with automatic translation generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {popularLanguages.map((lang) => (
              <Button
                key={lang.code}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(lang)}
                disabled={languages?.some(l => l.code === lang.code) || isGenerating}
              >
                {lang.flag} {lang.name}
              </Button>
            ))}
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
            {languages?.length || 0} languages configured
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
                const { count, total } = getCoverage(lang.code);
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
                            <Badge variant="secondary">Base</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {lang.code}
                          {lang.is_rtl && ' • RTL'}
                          {lang.font_family && ` • ${lang.font_family}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {complete ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-sm font-medium">
                            {count}/{total} namespaces
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {complete ? 'Complete' : 'Incomplete'}
                        </div>
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
  );
}