import { useEffect, useMemo, useCallback, useState } from 'react';
import { BlockNoteSchema, defaultBlockSpecs, PartialBlock } from '@blocknote/core';
import { 
  useCreateBlockNote, 
  SuggestionMenuController,
  SideMenuController,
  SideMenu,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useTheme } from 'next-themes';
import { WorkspacePage } from '@/hooks/useWorkspacePages';
import { cn } from '@/lib/utils';
import { customBlockSpecs } from './editor/customBlocks';
import { EditorToolbar } from './editor/EditorToolbar';
import { getCustomSlashMenuItems, filterSlashMenuItems } from './editor/SlashMenuItems';

// Create schema with custom blocks
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    ...customBlockSpecs,
  } as any,
});

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
      return undefined;
    }
    return page.content as PartialBlock[];
  }, [page.id]);

  const editor = useCreateBlockNote({
    schema,
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
      {!readOnly && <EditorToolbar editor={editor} />}
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        editable={!readOnly}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        slashMenu={false}
        sideMenu={false}
      >
        {/* Custom Slash Menu with our blocks */}
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSlashMenuItems(getCustomSlashMenuItems(editor), query)
          }
        />
        
        {/* Side Menu with Drag Handle for reordering blocks */}
        {!readOnly && (
          <SideMenuController
            sideMenu={(props) => (
              <SideMenu {...props} />
            )}
          />
        )}
      </BlockNoteView>
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
        
        .workspace-editor .callout-content {
          min-height: 1.5em;
        }
        
        /* Drag handle styling */
        .workspace-editor .bn-side-menu {
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        
        .workspace-editor [data-node-type="blockContainer"]:hover .bn-side-menu,
        .workspace-editor .bn-side-menu:hover {
          opacity: 1;
        }
        
        /* Slash menu styling */
        .workspace-editor .bn-suggestion-menu {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-height: 400px;
          overflow-y: auto;
        }
        
        .workspace-editor .bn-suggestion-menu-item {
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .workspace-editor .bn-suggestion-menu-item:hover,
        .workspace-editor .bn-suggestion-menu-item[data-hovered="true"] {
          background: hsl(var(--accent));
        }
        
        .workspace-editor .bn-suggestion-menu-item-title {
          font-weight: 500;
        }
        
        .workspace-editor .bn-suggestion-menu-item-subtitle {
          font-size: 12px;
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
}
