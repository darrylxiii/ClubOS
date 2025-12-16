import { useEffect, useMemo, useCallback, useState } from 'react';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useTheme } from 'next-themes';
import { WorkspacePage } from '@/hooks/useWorkspacePages';
import { cn } from '@/lib/utils';

interface WorkspaceEditorProps {
  page: WorkspacePage;
  onContentChange: (content: any[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function WorkspaceEditor({ 
  page, 
  onContentChange, 
  readOnly = false,
  className 
}: WorkspaceEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // Parse initial content
  const initialContent = useMemo(() => {
    if (!page.content || !Array.isArray(page.content) || page.content.length === 0) {
      return undefined; // Let BlockNote use default content
    }
    return page.content as PartialBlock[];
  }, [page.id]); // Only recalculate when page changes

  const editor = useCreateBlockNote({
    initialContent,
  });

  // Debounced save
  const handleChange = useCallback(() => {
    if (readOnly) return;
    const content = editor.document;
    onContentChange(content);
  }, [editor, onContentChange, readOnly]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className={cn("min-h-[500px] animate-pulse bg-muted/20 rounded-lg", className)} />
    );
  }

  return (
    <div className={cn("workspace-editor", className)}>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        editable={!readOnly}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      />
      <style>{`
        .workspace-editor .bn-container {
          --bn-colors-editor-background: transparent;
          --bn-colors-menu-background: hsl(var(--card));
          --bn-colors-tooltip-background: hsl(var(--popover));
          --bn-colors-hovered-background: hsl(var(--accent));
          --bn-colors-selected-background: hsl(var(--accent));
          --bn-colors-editor-text: hsl(var(--foreground));
          --bn-font-family: inherit;
        }
        
        .workspace-editor [data-node-type="blockContainer"] {
          padding: 3px 0;
        }
        
        .workspace-editor .bn-block-content {
          font-size: 16px;
          line-height: 1.6;
        }
        
        .workspace-editor h1 {
          font-size: 2em;
          font-weight: 700;
          margin-top: 1em;
        }
        
        .workspace-editor h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 0.8em;
        }
        
        .workspace-editor h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 0.6em;
        }
        
        .workspace-editor [data-content-type="checkListItem"] {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        
        .workspace-editor .bn-inline-content {
          min-height: 1.5em;
        }
      `}</style>
    </div>
  );
}
