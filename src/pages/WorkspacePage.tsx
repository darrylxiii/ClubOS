import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor';
import { PageHeader } from '@/components/workspace/PageHeader';
import { PageTreeSidebar } from '@/components/workspace/PageTreeSidebar';
import { useWorkspacePage, useWorkspacePages } from '@/hooks/useWorkspacePages';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { FileX, Plus } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

export default function WorkspacePage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading, error } = useWorkspacePage(pageId);
  const { updatePage, deletePage, duplicatePage, toggleFavorite, recordVisit, createPage } = useWorkspacePages();
  const lastSavedContent = useRef<string>('');

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

  const handleUpdate = useCallback((updates: Partial<typeof page>) => {
    if (!pageId) return;
    updatePage.mutate({ id: pageId, updates });
  }, [pageId, updatePage]);

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

  if (isLoading) {
    return (
      <AppLayout>
        <RoleGate allowedRoles={['admin', 'strategist', 'partner', 'user']}>
          <div className="flex h-[calc(100vh-64px)]">
            <PageTreeSidebar selectedPageId={pageId} />
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
            <PageTreeSidebar selectedPageId={pageId} />
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <FileX className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Page not found</h2>
              <p className="text-muted-foreground">
                This page may have been deleted or you don't have access to it.
              </p>
              <Button onClick={handleCreateNewPage}>
                <Plus className="h-4 w-4 mr-2" />
                Create new page
              </Button>
            </div>
          </div>
        </RoleGate>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist', 'partner', 'user']}>
        <div className="flex h-[calc(100vh-64px)]">
          <PageTreeSidebar selectedPageId={pageId} />
          
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <PageHeader
                page={page}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onToggleFavorite={handleToggleFavorite}
              />
              
              <div className="px-12 pb-24">
                <WorkspaceEditor
                  page={page}
                  onContentChange={handleContentChange}
                />
              </div>
            </div>
          </div>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
