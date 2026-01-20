import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Edit2, Check, X, Download, AlertTriangle, CheckCircle2, Bot, Globe } from 'lucide-react';
import { useTranslationNamespaces, useActiveLanguages } from '@/hooks/use-translation-namespaces';
import { 
  useNamespaceTranslations, 
  flattenTranslations, 
  useUpdateTranslation,
  useMarkAsReviewed,
  type FlatTranslation,
  type TranslationRecord
} from '@/hooks/use-translation-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type LanguageConfig = { code: string; name: string; native_name: string; flag: string; is_active: boolean; is_default: boolean };

export default function TranslationEditor() {
  const [selectedNamespace, setSelectedNamespace] = useState('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ key: string; lang: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const { data: namespaces } = useTranslationNamespaces();
  const { data: languages } = useActiveLanguages();
  const { data: translations, isLoading } = useNamespaceTranslations(selectedNamespace);
  const updateTranslation = useUpdateTranslation();
  const markAsReviewed = useMarkAsReviewed();
  
  const flatTranslations = useMemo(() => {
    if (!translations) return [];
    return flattenTranslations(translations);
  }, [translations]);
  
  const filteredTranslations = useMemo(() => {
    if (!searchQuery) return flatTranslations;
    const query = searchQuery.toLowerCase();
    return flatTranslations.filter(t => 
      t.key.toLowerCase().includes(query) ||
      Object.values(t.values).some(v => v.toLowerCase().includes(query))
    );
  }, [flatTranslations, searchQuery]);

  // Get translation record for a language to show quality data
  const getTranslationRecord = (lang: string): TranslationRecord | undefined => {
    return translations?.find(t => t.language === lang);
  };

  // Get quality badge for a language
  const getQualityBadge = (lang: string) => {
    const record = getTranslationRecord(lang);
    if (!record || lang === 'en') return null;
    
    const status = record.quality_status;
    const score = record.quality_score;
    const provider = record.translation_provider;
    
    return (
      <div className="flex items-center gap-1">
        {provider && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                {provider === 'google' ? (
                  <Globe className="h-3 w-3 text-blue-500" />
                ) : (
                  <Bot className="h-3 w-3 text-purple-500" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{provider === 'google' ? 'Google Translate' : 'Lovable AI'}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {status === 'validated' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CheckCircle2 className="h-3 w-3 text-green-500 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Human reviewed</p>
            </TooltipContent>
          </Tooltip>
        )}
        {status === 'needs_review' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-3 w-3 text-yellow-500 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Needs review (score: {score})</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  };
  
  const handleStartEdit = (key: string, lang: string, currentValue: string) => {
    setEditingCell({ key, lang });
    setEditValue(currentValue || '');
  };
  
  const handleSaveEdit = async () => {
    if (!editingCell) return;
    
    try {
      await updateTranslation.mutateAsync({
        namespace: selectedNamespace,
        language: editingCell.lang,
        key: editingCell.key,
        value: editValue,
      });
      toast.success('Translation updated and marked as reviewed');
      setEditingCell(null);
    } catch (error) {
      toast.error('Failed to update translation');
    }
  };
  
  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleMarkAllReviewed = async () => {
    const unreviewedRecords = translations?.filter(
      t => t.language !== 'en' && t.quality_status !== 'validated'
    ) || [];
    
    if (unreviewedRecords.length === 0) {
      toast.info('All translations in this namespace are already reviewed');
      return;
    }
    
    try {
      for (const record of unreviewedRecords) {
        await markAsReviewed.mutateAsync({ id: record.id });
      }
      toast.success(`Marked ${unreviewedRecords.length} translations as reviewed`);
    } catch (error) {
      toast.error('Failed to mark translations as reviewed');
    }
  };
  
  const handleExport = () => {
    if (!translations) return;
    
    const exportData = translations.reduce((acc, t) => {
      acc[t.language] = t.translations;
      return acc;
    }, {} as Record<string, any>);
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-${selectedNamespace}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Translations exported');
  };
  
  const activeLanguages = ((languages || []) as LanguageConfig[]).filter((l) => l.is_active);

  // Count unreviewed translations
  const unreviewedCount = translations?.filter(
    t => t.language !== 'en' && t.quality_status !== 'validated'
  ).length || 0;
  
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <TooltipProvider>
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Translation Editor</h1>
                <p className="text-muted-foreground">Edit and review translations for all languages</p>
              </div>
              <div className="flex gap-2">
                {unreviewedCount > 0 && (
                  <Button variant="outline" onClick={handleMarkAllReviewed} disabled={markAsReviewed.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark All Reviewed ({unreviewedCount})
                  </Button>
                )}
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex gap-4 flex-wrap">
                  <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select namespace" />
                    </SelectTrigger>
                    <SelectContent>
                      {namespaces?.map(ns => (
                        <SelectItem key={ns.namespace} value={ns.namespace}>
                          {ns.namespace}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search keys or values..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Badge variant="secondary" className="h-10 px-4 flex items-center">
                    {filteredTranslations.length} keys
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading translations...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium min-w-[200px]">Key</th>
                          {activeLanguages.map(lang => (
                            <th key={lang.code} className="text-left p-3 font-medium min-w-[200px]">
                              <div className="flex items-center gap-2">
                                <span>{lang.flag}</span>
                                <span>{lang.name}</span>
                                {lang.code === 'en' && (
                                  <Badge variant="outline" className="text-xs">Source</Badge>
                                )}
                                {getQualityBadge(lang.code)}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTranslations.map((translation) => (
                          <tr key={translation.key} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-sm text-muted-foreground">
                              {translation.key}
                            </td>
                            {activeLanguages.map(lang => {
                              const value = translation.values[lang.code] || '';
                              const isEditing = editingCell?.key === translation.key && editingCell?.lang === lang.code;
                              const record = getTranslationRecord(lang.code);
                              const hasWarning = record?.quality_status === 'needs_review';
                              
                              return (
                                <td 
                                  key={lang.code} 
                                  className={`p-3 ${hasWarning ? 'bg-yellow-500/10' : ''}`}
                                >
                                  {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                      <Textarea
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="min-h-[80px]"
                                        autoFocus
                                      />
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveEdit} disabled={updateTranslation.isPending}>
                                          <Check className="h-3 w-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                          <X className="h-3 w-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      className="group flex items-start gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                                      onClick={() => handleStartEdit(translation.key, lang.code, value)}
                                    >
                                      <span className={`flex-1 text-sm ${!value ? 'text-muted-foreground italic' : ''}`}>
                                        {value || '(empty)'}
                                      </span>
                                      <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TooltipProvider>
      </RoleGate>
    </AppLayout>
  );
}
