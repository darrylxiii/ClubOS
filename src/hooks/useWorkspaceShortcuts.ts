import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspacePages } from './useWorkspacePages';

interface UseWorkspaceShortcutsOptions {
  onSearch?: () => void;
  onToggleSidebar?: () => void;
  pageId?: string;
}

export function useWorkspaceShortcuts({
  onSearch,
  onToggleSidebar,
  pageId,
}: UseWorkspaceShortcutsOptions = {}) {
  const navigate = useNavigate();
  const { createPage, duplicatePage, pages } = useWorkspacePages();

  const handleNewPage = useCallback(async () => {
    const newPage = await createPage.mutateAsync({});
    navigate(`/pages/${newPage.id}`);
  }, [createPage, navigate]);

  const handleNewSubpage = useCallback(async () => {
    if (!pageId) return;
    const newPage = await createPage.mutateAsync({ parent_page_id: pageId });
    navigate(`/pages/${newPage.id}`);
  }, [createPage, navigate, pageId]);

  const handleDuplicatePage = useCallback(() => {
    if (!pageId) return;
    const page = pages.find(p => p.id === pageId);
    if (page) {
      duplicatePage.mutate(page);
    }
  }, [duplicatePage, pageId, pages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if user is typing in an input/textarea (except for escape)
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;

      // Cmd/Ctrl + P - Quick page search
      if (modifier && e.key === 'p') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Cmd/Ctrl + N - New page
      if (modifier && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        handleNewPage();
        return;
      }

      // Cmd/Ctrl + Shift + N - New subpage
      if (modifier && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        handleNewSubpage();
        return;
      }

      // Cmd/Ctrl + / - Toggle sidebar
      if (modifier && e.key === '/') {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }

      // Cmd/Ctrl + Shift + D - Duplicate page
      if (modifier && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        handleDuplicatePage();
        return;
      }

      // Escape - Close search or deselect
      if (e.key === 'Escape') {
        // Let other components handle this
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNewPage,
    handleNewSubpage,
    handleDuplicatePage,
    onSearch,
    onToggleSidebar,
  ]);

  return {
    handleNewPage,
    handleNewSubpage,
    handleDuplicatePage,
  };
}
