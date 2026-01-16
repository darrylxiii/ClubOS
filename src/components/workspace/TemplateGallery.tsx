import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Layout, 
  FileText, 
  Users, 
  Briefcase, 
  BookOpen, 
  Folder,
  Eye,
  Copy,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { cn } from '@/lib/utils';

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
  onPreview?: (template: Template) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Layout; label: string; color: string }> = {
  onboarding: { icon: Sparkles, label: 'Onboarding', color: 'bg-purple-500/20 text-purple-500' },
  'meeting-notes': { icon: Users, label: 'Meeting Notes', color: 'bg-blue-500/20 text-blue-500' },
  project: { icon: Briefcase, label: 'Projects', color: 'bg-green-500/20 text-green-500' },
  recruitment: { icon: Users, label: 'Recruitment', color: 'bg-orange-500/20 text-orange-500' },
  documentation: { icon: BookOpen, label: 'Documentation', color: 'bg-cyan-500/20 text-cyan-500' },
  custom: { icon: Folder, label: 'Custom', color: 'bg-gray-500/20 text-gray-500' },
};

export function TemplateGallery({ onSelectTemplate, onPreview }: TemplateGalleryProps) {
  const { templates, isLoading, categories, incrementUsage } = useTemplates();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = async (template: Template) => {
    await incrementUsage.mutateAsync(template.id);
    onSelectTemplate(template);
  };

  const getCategoryConfig = (category: string | null) => {
    return CATEGORY_CONFIG[category || 'custom'] || CATEGORY_CONFIG.custom;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="gap-2">
            <Layout className="h-4 w-4" />
            All
          </TabsTrigger>
          {categories.map((category) => {
            const config = getCategoryConfig(category);
            const Icon = config.icon;
            return (
              <TabsTrigger key={category} value={category ?? 'custom'} className="gap-2">
                <Icon className="h-4 w-4" />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground">
                {search ? 'Try a different search term' : 'No templates in this category yet'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const categoryConfig = getCategoryConfig(template.category);
                const CategoryIcon = categoryConfig.icon;

                return (
                  <Card
                    key={template.id}
                    className={cn(
                      "group relative overflow-hidden transition-all hover:shadow-lg",
                      "bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm",
                      "border border-border/50 hover:border-primary/30"
                    )}
                  >
                    {/* Cover Image or Gradient */}
                    {template.cover_url ? (
                      <div 
                        className="h-24 bg-cover bg-center"
                        style={{ backgroundImage: `url(${template.cover_url})` }}
                      />
                    ) : (
                      <div className={cn(
                        "h-24 bg-gradient-to-br",
                        template.category === 'onboarding' && "from-purple-500/20 to-pink-500/20",
                        template.category === 'meeting-notes' && "from-blue-500/20 to-cyan-500/20",
                        template.category === 'project' && "from-green-500/20 to-emerald-500/20",
                        template.category === 'recruitment' && "from-orange-500/20 to-amber-500/20",
                        !template.category && "from-gray-500/20 to-slate-500/20"
                      )} />
                    )}

                    <div className="p-4">
                      {/* Icon and Title */}
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-2xl">{template.icon || '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{template.name}</h3>
                          <Badge variant="secondary" className={cn("mt-1", categoryConfig.color)}>
                            <CategoryIcon className="h-3 w-3 mr-1" />
                            {categoryConfig.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {template.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {template.usage_count || 0} uses
                        </span>
                        {template.visibility === 'system' && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSelectTemplate(template)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Use
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{previewTemplate?.icon || '📄'}</span>
              {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              {previewTemplate.description && (
                <p className="text-muted-foreground">{previewTemplate.description}</p>
              )}
              
              {/* Content Preview */}
              <Card className="p-4 bg-muted/20">
                <h4 className="text-sm font-medium mb-2">Content Preview</h4>
                <div className="space-y-2 text-sm">
                  {previewTemplate.content?.slice(0, 5).map((block: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>
                        {block.type === 'heading' && `Heading: ${block.content?.[0]?.text || ''}`}
                        {block.type === 'paragraph' && (block.content?.[0]?.text || 'Paragraph')}
                        {block.type === 'bulletListItem' && `• ${block.content?.[0]?.text || ''}`}
                        {block.type === 'numberedListItem' && `1. ${block.content?.[0]?.text || ''}`}
                        {block.type === 'checkListItem' && `☐ ${block.content?.[0]?.text || ''}`}
                      </span>
                    </div>
                  ))}
                  {(previewTemplate.content?.length || 0) > 5 && (
                    <p className="text-muted-foreground italic">
                      ...and {previewTemplate.content!.length - 5} more blocks
                    </p>
                  )}
                </div>
              </Card>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  handleSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
