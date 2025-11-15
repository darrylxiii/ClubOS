import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Languages, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const LANGUAGES = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
];

const NAMESPACES = ['common', 'auth', 'onboarding'];

export default function TranslationManager() {
  const [selectedNamespace, setSelectedNamespace] = useState('common');
  const [selectedLanguage, setSelectedLanguage] = useState('nl');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedTranslations, setGeneratedTranslations] = useState<Record<string, string>>({});
  const [englishSource, setEnglishSource] = useState<Record<string, any>>({});

  useEffect(() => {
    loadEnglishSource();
  }, [selectedNamespace]);

  const loadEnglishSource = async () => {
    try {
      const response = await fetch(`/locales/en/${selectedNamespace}.json`);
      const data = await response.json();
      setEnglishSource(data);
    } catch (error) {
      console.error('Failed to load English source:', error);
      toast.error('Failed to load English translations');
    }
  };

  const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
    const flattened: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        flattened[newKey] = String(value);
      }
    }
    
    return flattened;
  };

  const unflattenObject = (flattened: Record<string, string>): any => {
    const result: any = {};
    
    for (const [key, value] of Object.entries(flattened)) {
      const parts = key.split('.');
      let current = result;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
    }
    
    return result;
  };

  const generateTranslations = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const flattened = flattenObject(englishSource);
      const texts = Object.values(flattened);
      const keys = Object.keys(flattened);

      toast.info(`Starting translation of ${texts.length} strings to ${selectedLanguage}...`);

      const { data, error } = await supabase.functions.invoke('batch-translate', {
        body: {
          texts,
          targetLanguage: selectedLanguage,
          context: `${selectedNamespace}_translation`,
        }
      });

      if (error) {
        throw error;
      }

      if (!data || !data.translations) {
        throw new Error('No translations returned');
      }

      const translationsMap: Record<string, string> = {};
      keys.forEach((key, index) => {
        translationsMap[key] = data.translations[index];
      });

      setGeneratedTranslations(translationsMap);
      setProgress(100);
      
      toast.success(`Successfully translated ${texts.length} strings!`);
    } catch (error: any) {
      console.error('Translation error:', error);
      
      if (error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait and try again.');
      } else if (error.message?.includes('Payment required')) {
        toast.error('Please add credits to your Lovable AI workspace.');
      } else {
        toast.error('Translation failed: ' + error.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllLanguages = async () => {
    for (const lang of LANGUAGES) {
      setSelectedLanguage(lang.code);
      await generateTranslations();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between languages
    }
  };

  const downloadJSON = () => {
    const unflattened = unflattenObject(generatedTranslations);
    const json = JSON.stringify(unflattened, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNamespace}-${selectedLanguage}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Translation file downloaded!');
  };

  const getTotalKeys = () => {
    return Object.keys(flattenObject(englishSource)).length;
  };

  const getTranslatedKeys = () => {
    return Object.keys(generatedTranslations).length;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
          Translation Manager
        </h1>
        <p className="text-muted-foreground">
          AI-powered translation generator for The Quantum Club
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Generate Translations
          </CardTitle>
          <CardDescription>
            Automatically translate UI strings using Lovable AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Namespace</label>
              <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NAMESPACES.map(ns => (
                    <SelectItem key={ns} value={ns}>
                      {ns}.json
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Language</label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Source: {getTotalKeys()} keys in English
              </span>
              {getTranslatedKeys() > 0 && (
                <Badge variant="secondary">
                  {getTranslatedKeys()} / {getTotalKeys()} translated
                </Badge>
              )}
            </div>
            {isGenerating && (
              <Progress value={progress} className="w-full" />
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateTranslations}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4 mr-2" />
                  Generate {selectedLanguage.toUpperCase()} Translations
                </>
              )}
            </Button>

            {getTranslatedKeys() > 0 && (
              <Button
                onClick={downloadJSON}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
            )}
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Cost Estimate</span>
            </div>
            <p className="text-xs text-muted-foreground">
              ~${(getTotalKeys() * 0.002).toFixed(2)} per language using Lovable AI (Gemini 2.5 Flash)
            </p>
          </div>
        </CardContent>
      </Card>

      {getTranslatedKeys() > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Showing {getTranslatedKeys()} translated keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="side-by-side">
              <TabsList>
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="json">JSON Output</TabsTrigger>
              </TabsList>
              
              <TabsContent value="side-by-side" className="space-y-2">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {Object.entries(generatedTranslations).slice(0, 20).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg text-sm">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground mb-1">{key}</div>
                        <div>{flattenObject(englishSource)[key]}</div>
                      </div>
                      <div className="border-l pl-4">
                        <div className="font-mono text-xs text-muted-foreground mb-1">
                          {selectedLanguage}
                        </div>
                        <div>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="json">
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96">
                  {JSON.stringify(unflattenObject(generatedTranslations), null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
