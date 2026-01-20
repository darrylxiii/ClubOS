import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { useRole } from '@/contexts/RoleContext';
import { PageTreeSidebar } from '@/components/workspace/PageTreeSidebar';
import { PageSearchDialog } from '@/components/workspace/PageSearchDialog';
import { useWorkspacePages, PageTemplate } from '@/hooks/useWorkspacePages';
import { useWorkspaceShortcuts } from '@/hooks/useWorkspaceShortcuts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  FileText, 
  Star,
  Clock,
  Layout,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Settings,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function WorkspaceList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  
  const defaultTab = searchParams.get('tab') || 'all';
  
  const { 
    pages, 
    favorites, 
    recent, 
    templates, 
    createPage, 
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkspacePages();
  
  const { currentRole } = useRole();
  const isAdmin = currentRole === 'admin' || currentRole === 'strategist';

  // Keyboard shortcuts
  useWorkspaceShortcuts({
    onSearch: () => setShowSearch(true),
    onToggleSidebar: () => setShowSidebar(prev => !prev),
  });

  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreatePage = async (template?: PageTemplate) => {
    const newPage = await createPage.mutateAsync({
      title: template ? template.name : 'Untitled',
      content: template ? template.content : [],
      icon_emoji: template?.icon || undefined,
    });
    navigate(`/pages/${newPage.id}`);
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist', 'partner', 'user']}>
        <div className="flex h-[calc(100vh-64px)]">
          {showSidebar && <PageTreeSidebar />}
          
          <div className="flex-1 overflow-y-auto">
            {/* Top Bar */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSidebar(prev => !prev)}
                >
                  {showSidebar ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeft className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">Quantum OS</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(true)}
                className="text-muted-foreground"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
                <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-muted rounded">⌘P</kbd>
              </Button>
            </div>

            <div className="max-w-5xl mx-auto p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold">Quantum OS</h1>
                  <p className="text-muted-foreground mt-1">
                    Your personal workspace for notes, docs, and more
                  </p>
                </div>
                <Button onClick={() => handleCreatePage()}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Page
                </Button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pages..."
                  className="pl-10"
                />
              </div>

              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="all" className="gap-2">
                    <FileText className="h-4 w-4" />
                    All Pages
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="gap-2">
                    <Star className="h-4 w-4" />
                    Favorites
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="gap-2">
                    <Clock className="h-4 w-4" />
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="gap-2">
                    <Layout className="h-4 w-4" />
                    Templates
                  </TabsTrigger>
                </TabsList>

                {/* All Pages */}
                <TabsContent value="all">
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : isError ? (
                    <Card className="p-12 text-center">
                      <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Failed to load pages</h3>
                      <p className="text-muted-foreground mb-4">
                        {(error as Error)?.message || 'Something went wrong. Please try again.'}
                      </p>
                      <Button onClick={() => refetch()} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </Card>
                  ) : filteredPages.length === 0 ? (
                    <Card className="p-12 text-center">
                      <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Create your first page</h3>
                      <p className="text-muted-foreground mb-4">
                        Start with a blank page or choose from our templates
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => handleCreatePage()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Blank page
                        </Button>
                        <Button variant="outline" onClick={() => {}}>
                          <Layout className="h-4 w-4 mr-2" />
                          Use template
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPages.map((page) => (
                        <Card
                          key={page.id}
                          className="p-4 cursor-pointer hover:bg-accent/50 transition-colors group"
                          onClick={() => navigate(`/pages/${page.id}`)}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{page.icon_emoji || '📄'}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">
                                {page.title || 'Untitled'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(page.updated_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                            {page.is_favorite && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Favorites */}
                <TabsContent value="favorites">
                  {favorites.length === 0 ? (
                    <Card className="p-12 text-center">
                      <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                      <p className="text-muted-foreground">
                        Click the star icon on any page to add it to your favorites
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {favorites.map((page) => (
                        <Card
                          key={page.id}
                          className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => navigate(`/pages/${page.id}`)}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{page.icon_emoji || '📄'}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">
                                {page.title || 'Untitled'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(page.updated_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Recent */}
                <TabsContent value="recent">
                  {recent.length === 0 ? (
                    <Card className="p-12 text-center">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No recent pages</h3>
                      <p className="text-muted-foreground">
                        Pages you visit will appear here for quick access
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recent.map((page) => (
                        <Card
                          key={page.id}
                          className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => navigate(`/pages/${page.id}`)}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{page.icon_emoji || '📄'}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">
                                {page.title || 'Untitled'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(page.updated_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Templates */}
                <TabsContent value="templates">
                  {/* Admin quick action */}
                  {isAdmin && (
                    <div className="flex items-center justify-between mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div>
                        <h3 className="font-medium">Template Management</h3>
                        <p className="text-sm text-muted-foreground">
                          Create, edit, and import templates for your team
                        </p>
                      </div>
                      <Button onClick={() => navigate('/admin/templates')}>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Templates
                      </Button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className="p-4 cursor-pointer hover:bg-accent/50 transition-colors group"
                        onClick={() => handleCreatePage(template)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{template.icon || '📄'}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{template.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Use template
                        </Button>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
        
        {/* Search Dialog */}
        <PageSearchDialog open={showSearch} onOpenChange={setShowSearch} />
      </RoleGate>
    </AppLayout>
  );
}
