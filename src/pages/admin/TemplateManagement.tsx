import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Upload,
  Layout,
  FileText,
  Edit2,
  Trash2,
  Users,
  Building,
  User,
} from 'lucide-react';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { TemplateEditor } from '@/components/workspace/TemplateEditor';
import { NotionImporter } from '@/components/workspace/NotionImporter';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function TemplateManagement() {
  const { templates, isLoading, deleteTemplate } = useTemplates();
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [showImporter, setShowImporter] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description?.toLowerCase().includes(search.toLowerCase());

    const matchesVisibility =
      visibilityFilter === 'all' || template.visibility === visibilityFilter;

    return matchesSearch && matchesVisibility;
  });

  const stats = {
    total: templates.length,
    system: templates.filter(t => t.visibility === 'system').length,
    company: templates.filter(t => t.visibility === 'company').length,
    personal: templates.filter(t => t.visibility === 'personal').length,
    totalUsage: templates.reduce((sum, t) => sum + (t.usage_count || 0), 0),
  };

  const handleDelete = async (template: Template) => {
    if (confirm(`Delete template "${template.name}"?`)) {
      await deleteTemplate.mutateAsync(template.id);
    }
  };

  // Show editor if creating or editing
  if (isCreating || editingTemplate) {
    return (
      <AppLayout>
        <RoleGate allowedRoles={['admin', 'strategist']}>
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <TemplateEditor
              template={editingTemplate || undefined}
              onSave={() => {
                setIsCreating(false);
                setEditingTemplate(null);
              }}
              onCancel={() => {
                setIsCreating(false);
                setEditingTemplate(null);
              }}
            />
          </div>
        </RoleGate>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold">Template Management</h1>
              <p className="text-muted-foreground">
                Create and manage templates for your team
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowImporter(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import from Notion
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Layout className="h-4 w-4" />
                <span className="text-sm">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">System</span>
              </div>
              <p className="text-2xl font-bold">{stats.system}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building className="h-4 w-4" />
                <span className="text-sm">Company</span>
              </div>
              <p className="text-2xl font-bold">{stats.company}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                <span className="text-sm">Personal</span>
              </div>
              <p className="text-2xl font-bold">{stats.personal}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total Uses</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalUsage}</p>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="pl-10"
              />
            </div>
            <Tabs value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="personal">Personal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Templates List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'Try a different search term' : 'Create your first template to get started'}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
                <Button variant="outline" onClick={() => setShowImporter(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import from Notion
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    "group relative overflow-hidden transition-all hover:shadow-lg",
                    "bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm",
                    "border border-border/50 hover:border-primary/30"
                  )}
                >
                  {/* Cover */}
                  {template.cover_url ? (
                    <div
                      className="h-20 bg-cover bg-center"
                      style={{ backgroundImage: `url(${template.cover_url})` }}
                    />
                  ) : (
                    <div className="h-20 bg-gradient-to-br from-primary/10 to-primary/5" />
                  )}

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-2xl">{template.icon || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{template.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              template.visibility === 'system' && "bg-blue-500/20 text-blue-500",
                              template.visibility === 'company' && "bg-green-500/20 text-green-500",
                              template.visibility === 'personal' && "bg-purple-500/20 text-purple-500"
                            )}
                          >
                            {template.visibility === 'system' && <Users className="h-3 w-3 mr-1" />}
                            {template.visibility === 'company' && <Building className="h-3 w-3 mr-1" />}
                            {template.visibility === 'personal' && <User className="h-3 w-3 mr-1" />}
                            {template.visibility}
                          </Badge>
                          {template.category && (
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {template.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {template.usage_count || 0} uses
                      </span>
                      <span>
                        {format(new Date(template.created_at || ''), 'MMM d, yyyy')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(template)}
                        disabled={deleteTemplate.isPending}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Notion Importer Dialog */}
        <NotionImporter
          open={showImporter}
          onOpenChange={setShowImporter}
        />
      </RoleGate>
    </AppLayout>
  );
}
