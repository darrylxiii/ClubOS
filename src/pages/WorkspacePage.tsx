import { useEffect, useCallback, useRef, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { PageHeader } from '@/components/workspace/PageHeader';
import { DraggablePageTree } from '@/components/workspace/DraggablePageTree';

// Lazy load heavy editor component to prevent TDZ errors on /auth route
const WorkspaceEditor = lazy(() => import('@/components/workspace/WorkspaceEditor').then(m => ({ default: m.WorkspaceEditor })));
import { PageBreadcrumbs } from '@/components/workspace/PageBreadcrumbs';
import { PageSearchDialog } from '@/components/workspace/PageSearchDialog';
import { WorkspaceCommandRegistry } from '@/components/workspace/WorkspaceCommandPalette';
import { KeyboardShortcutsHelp } from '@/components/workspace/KeyboardShortcutsHelp';
import { QuickCapture } from '@/components/workspace/QuickCapture';
import { useWorkspacePage, useWorkspacePages } from '@/hooks/useWorkspacePages';
import { useWorkspaceShortcuts } from '@/hooks/useWorkspaceShortcuts';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { FileX, Plus, Search, PanelLeftClose, PanelLeft, Command, Keyboard, Menu } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useIsMobile } from '@/hooks/use-mobile';

export default function WorkspacePage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: page, isLoading, error } = useWorkspacePage(pageId);
  const { updatePage, deletePage, duplicatePage, toggleFavorite, recordVisit, createPage, pages } = useWorkspacePages();
  const lastSavedContent = useRef<string>('');

  // UI State
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Keyboard shortcuts
  useWorkspaceShortcuts({
    pageId,
    onSearch: () => setShowSearch(true),
    onToggleSidebar: () => isMobile ? setMobileSidebarOpen(prev => !prev) : setShowSidebar(prev => !prev),
    onOpenCommandPalette: () => { }, // Global command palette handles this now
    onOpenShortcutsHelp: () => setShowShortcutsHelp(true),
    onQuickCapture: () => setShowQuickCapture(true),
  });

  // Record page visit
  useEffect(() => {
    if (pageId) {
      recordVisit.mutate(pageId);
    }
  }, [pageId]);

  // Debounced content save
  const debouncedSave = useDebouncedCallback(
    (content: any[]) => {
      if (!pageId) return;
      const contentStr = JSON.stringify(content);
      if (contentStr !== lastSavedContent.current) {
        lastSavedContent.current = contentStr;
        updatePage.mutate({ id: pageId, updates: { content } });
      }
    },
    1000
  );

  const handleContentChange = useCallback((content: any[]) => {
    debouncedSave(content);
  }, [debouncedSave]);

  const handleUpdate = useCallback((updates: Partial<NonNullable<typeof page>>) => {
    if (!pageId || !page) return;
    updatePage.mutate({ id: pageId, updates });
  }, [pageId, page, updatePage]);

  const handleDelete = useCallback(() => {
    if (!pageId) return;
    deletePage.mutate(pageId);
    navigate('/pages');
  }, [pageId, deletePage, navigate]);

  const handleDuplicate = useCallback(() => {
    if (!page) return;
    duplicatePage.mutate(page);
  }, [page, duplicatePage]);

  const handleToggleFavorite = useCallback(() => {
    if (!pageId || !page) return;
    toggleFavorite.mutate({ id: pageId, is_favorite: !page.is_favorite });
  }, [pageId, page, toggleFavorite]);

  const handleCreateNewPage = async () => {
    const newPage = await createPage.mutateAsync({});
    navigate(`/pages/${newPage.id}`);
  };

  // Mobile sidebar component
  const SidebarContent = () => <DraggablePageTree selectedPageId={pageId} />;

  if (isLoading) {
    return (
      <AppLayout>
        <RoleGate allowedRoles={['admin', 'strategist', 'partner', 'user']}>
          <div className="flex h-[calc(100vh-64px)]">
            {!isMobile && showSidebar && <SidebarContent />}
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </RoleGate>
      </AppLayout>
    );
  }

  if (error || !page) {
    return (
      <AppLayout>
        <RoleGate allowedRoles={['admin', 'strategist', 'partner', 'user']}>
          <div className="flex h-[calc(100vh-64px)]">
            {!isMobile && showSidebar && <SidebarContent />}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
              <FileX className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Page not found</h2>
              <p className="text-muted-foreground text-center">
                This page may have been deleted or you don't have access to it.
              </p>
              <Button onClick={handleCreateNewPage}>
                <Plus className="h-4 w-4 mr-2" />
                Create new page
              </Button>
            </div>
          </div>
          <PageSearchDialog open={showSearch} onOpenChange={setShowSearch} />
        </RoleGate>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist', 'partner', 'user']}>
        <div className="flex h-[calc(100vh-64px)]">
          {/* Desktop Sidebar */}
          {!isMobile && showSidebar && <SidebarContent />}

          {/* Mobile Sidebar Sheet */}
          {isMobile && (
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
              <SheetContent side="left" className="p-0 w-[280px]">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* Top Bar with breadcrumbs and actions */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-2 sm:px-4 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => isMobile ? setMobileSidebarOpen(true) : setShowSidebar(prev => !prev)}
                >
                  {isMobile ? (
                    <Menu className="h-4 w-4" />
                  ) : showSidebar ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeft className="h-4 w-4" />
                  )}
                </Button>
                <div className="min-w-0 overflow-hidden">
                  <PageBreadcrumbs page={page} pages={pages} />
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Command Palette Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))} // Trigger global
                  className="text-muted-foreground hidden sm:flex"
                >
                  <Command className="h-4 w-4 mr-1" />
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘K</kbd>
                </Button>

                {/* Search Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(true)}
                  className="text-muted-foreground"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Search</span>
                  <kbd className="hidden sm:inline ml-2 px-1.5 py-0.5 text-xs bg-muted rounded">⌘P</kbd>
                </Button>

                {/* Shortcuts Help */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden sm:flex"
                  onClick={() => setShowShortcutsHelp(true)}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-w-4xl mx-auto">
              <PageHeader
                page={page}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onToggleFavorite={handleToggleFavorite}
              />

              <div className="px-4 sm:px-12 pb-24">
                <Suspense fallback={<div className="min-h-[500px] animate-pulse bg-muted/20 rounded-lg" />}>
                  <WorkspaceEditor
                    page={page}
                    onContentChange={handleContentChange}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Quick Actions FAB */}
        {isMobile && (
          <div className="fixed bottom-4 right-4 flex flex-col gap-2">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={() => setShowQuickCapture(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Dialogs */}
        <PageSearchDialog open={showSearch} onOpenChange={setShowSearch} />
        <WorkspaceCommandRegistry
          pageId={pageId}
          onInsertBlock={(type) => { /* Handle block insertion if we can access editor instance, or better yet, make registry handle it if passed down */ }}
        />
        <KeyboardShortcutsHelp
          open={showShortcutsHelp}
          onOpenChange={setShowShortcutsHelp}
        />
        <QuickCapture
          open={showQuickCapture}
          onOpenChange={setShowQuickCapture}
        />
      </RoleGate>
    </AppLayout>
  );
}
