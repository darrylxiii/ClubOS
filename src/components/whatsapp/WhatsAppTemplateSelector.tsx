import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  FileText, 
  Check,
  MessageSquare,
  Megaphone,
  Key,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";

interface WhatsAppTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  templates: WhatsAppTemplate[];
  loading?: boolean;
  syncing?: boolean;
  onSync?: () => void;
  onSelect: (template: WhatsAppTemplate, params: Record<string, string>) => void;
}

type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'all';

export function WhatsAppTemplateSelector({
  open,
  onClose,
  templates,
  loading,
  syncing,
  onSync,
  onSelect
}: WhatsAppTemplateSelectorProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TemplateCategory>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  // Extract variables from template
  const extractVariables = (template: WhatsAppTemplate): string[] => {
    const variables: string[] = [];
    const components = template.components;
    
    // Handle array format (correct Meta API format)
    if (Array.isArray(components)) {
      components.forEach(comp => {
        if (comp.text) {
          const matches = comp.text.match(/\{\{(\d+)\}\}/g);
          if (matches) {
            matches.forEach((match: string) => {
              const num = match.replace(/[{}]/g, '');
              if (!variables.includes(num)) {
                variables.push(num);
              }
            });
          }
        }
      });
    }
    // Handle legacy object format
    else if (components && typeof components === 'object' && (components as any).body) {
      const bodyText = (components as any).body as string;
      const matches = bodyText.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const num = match.replace(/[{}]/g, '');
          if (!variables.includes(num)) {
            variables.push(num);
          }
        });
      }
    }
    
    return variables.sort();
  };

  // Get preview text from template
  const getTemplatePreview = (template: WhatsAppTemplate): string => {
    const components = template.components;
    
    // Handle array format (correct Meta API format)
    if (Array.isArray(components)) {
      const bodyComp = components.find(c => c.type === 'BODY');
      return bodyComp?.text || '';
    }
    
    // Handle legacy object format
    if (components && typeof components === 'object' && (components as any).body) {
      return (components as any).body as string;
    }
    
    return '';
  };

  // Get template with variables replaced
  const getPreviewWithParams = (template: WhatsAppTemplate): string => {
    let preview = getTemplatePreview(template);
    
    Object.entries(params).forEach(([key, value]) => {
      preview = preview.replace(`{{${key}}}`, value || `[${key}]`);
    });
    
    return preview;
  };

  const filteredTemplates = useMemo(() => {
    let filtered = templates;
    
    if (category !== 'all') {
      filtered = filtered.filter(t => t.template_category === category);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(t => 
        (t.template_name ?? '').toLowerCase().includes(searchLower) ||
        getTemplatePreview(t).toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [templates, category, search]);

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    // Reset params when selecting new template
    const variables = extractVariables(template);
    const newParams: Record<string, string> = {};
    variables.forEach(v => { newParams[v] = ''; });
    setParams(newParams);
  };

  const handleConfirm = () => {
    if (!selectedTemplate) return;
    onSelect(selectedTemplate, params);
    handleClose();
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setParams({});
    setSearch("");
    onClose();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'MARKETING': return <Megaphone className="w-4 h-4" />;
      case 'UTILITY': return <MessageSquare className="w-4 h-4" />;
      case 'AUTHENTICATION': return <Key className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'MARKETING': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'UTILITY': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'AUTHENTICATION': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const variables = selectedTemplate ? extractVariables(selectedTemplate) : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#25d366]" />
              Select Template
            </DialogTitle>
            {onSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={syncing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
                Sync Templates
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 p-6 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !selectedTemplate ? (
          <>
            {/* Search & Filter */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Tabs value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                  <TabsTrigger value="MARKETING" className="flex-1">Marketing</TabsTrigger>
                  <TabsTrigger value="UTILITY" className="flex-1">Utility</TabsTrigger>
                  <TabsTrigger value="AUTHENTICATION" className="flex-1">Auth</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Template List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredTemplates.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No templates found</p>
                    </motion.div>
                  ) : (
                    filteredTemplates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleSelectTemplate(template)}
                        className={cn(
                          "p-4 rounded-xl border cursor-pointer transition-all",
                          "hover:bg-muted/50 hover:border-primary/30",
                          "group"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">
                                {(template.template_name ?? '').replace(/_/g, ' ')}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getCategoryColor(template.template_category ?? ''))}
                              >
                                {getCategoryIcon(template.template_category ?? '')}
                                <span className="ml-1">{template.template_category}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {getTemplatePreview(template)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {template.language_code}
                              </Badge>
                              {extractVariables(template).length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {extractVariables(template).length} variables
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Template Configuration */}
            <div className="flex-1 p-6 space-y-6 overflow-auto">
              {/* Selected Template Preview */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">
                    {(selectedTemplate.template_name ?? '').replace(/_/g, ' ')}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    Change
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {getPreviewWithParams(selectedTemplate)}
                </p>
              </div>

              {/* Variable Inputs */}
              {variables.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Fill in Variables</h4>
                  {variables.map((variable) => (
                    <div key={variable} className="space-y-2">
                      <Label htmlFor={`var-${variable}`}>
                        Variable {variable}
                      </Label>
                      <Input
                        id={`var-${variable}`}
                        placeholder={`Enter value for {{${variable}}}`}
                        value={params[variable] || ''}
                        onChange={(e) => setParams(prev => ({
                          ...prev,
                          [variable]: e.target.value
                        }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Live Preview */}
              <div>
                <h4 className="font-semibold mb-3">Preview</h4>
                <div className="p-4 rounded-xl bg-[#005c4b] text-white">
                  <p className="text-sm whitespace-pre-wrap">
                    {getPreviewWithParams(selectedTemplate)}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Back
              </Button>
              <Button 
                onClick={handleConfirm}
                className="bg-[#25d366] hover:bg-[#25d366]/90"
              >
                <Check className="w-4 h-4 mr-2" />
                Send Template
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
