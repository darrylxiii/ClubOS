import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
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
import { getCustomBlockSpecs } from './editor/customBlocks';
import { EditorToolbar } from './editor/EditorToolbar';
import { getCustomSlashMenuItems, filterSlashMenuItems } from './editor/SlashMenuItems';
import { useCollaborativeCursors } from '@/hooks/useCollaborativeCursors';
import { useRealtimeContentSync } from '@/hooks/useRealtimeContentSync';
import { CollaborativeCursors } from './CollaborativeCursors';
import { BlockSelectionHighlight } from './BlockSelectionHighlight';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { AIWritingToolbar } from './ai/AIWritingToolbar';
import { AISlashCommandDialog } from './ai/AISlashCommandDialog';

// Lazy schema creation - only runs when component mounts, not at module evaluation
function createEditorSchema() {
  return BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      ...getCustomBlockSpecs(),
    } as any,
  });
}

interface WorkspaceEditorProps {
  page: WorkspacePage;
  onContentChange: (content: any[]) => void;
  readOnly?: boolean;
  className?: string;
  enableCollaboration?: boolean;
}

export function WorkspaceEditor({ 
  page, 
  onContentChange, 
  readOnly = false,
  className,
  enableCollaboration = true
}: WorkspaceEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Collaboration hooks
  const { 
    cursors, 
    isConnected, 
    updateCursorPosition, 
    setTypingStatus, 
    selectBlock 
  } = useCollaborativeCursors(enableCollaboration ? page.id : undefined);
  
  const { 
    syncState, 
    remoteChanges, 
    broadcastChange, 
    broadcastFullSync,
    clearRemoteChanges 
  } = useRealtimeContentSync(enableCollaboration ? page.id : undefined);

  // Parse initial content
  const initialContent = useMemo(() => {
    if (!page.content || !Array.isArray(page.content) || page.content.length === 0) {
      return undefined;
    }
    return page.content as PartialBlock[];
  }, [page.id]);

  // Create schema lazily at mount time to avoid TDZ errors
  const schema = useMemo(() => createEditorSchema(), []);

  const editor = useCreateBlockNote({
    schema,
    initialContent,
  });

  // Handle cursor movement
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enableCollaboration || readOnly) return;
    updateCursorPosition(e.clientX, e.clientY);
  }, [enableCollaboration, readOnly, updateCursorPosition]);

  // Handle typing status
  const handleKeyDown = useCallback(() => {
    if (!enableCollaboration || readOnly) return;
    setTypingStatus(true);
  }, [enableCollaboration, readOnly, setTypingStatus]);

  const handleKeyUp = useCallback(() => {
    if (!enableCollaboration || readOnly) return;
    // Debounce typing status off
    setTimeout(() => setTypingStatus(false), 1000);
  }, [enableCollaboration, readOnly, setTypingStatus]);

  // Debounced save
  const handleChange = useCallback(() => {
    if (readOnly) return;
    const content = editor.document;
    onContentChange(content);
    
    // Broadcast change to other users
    if (enableCollaboration) {
      broadcastChange({ type: 'update', content });
    }
  }, [editor, onContentChange, readOnly, enableCollaboration, broadcastChange]);

  // Apply remote changes
  useEffect(() => {
    if (remoteChanges.length === 0) return;
    
    remoteChanges.forEach(change => {
      if (change.type === 'replace' && change.content) {
        // Handle full content replacement from another user
        // Note: BlockNote doesn't have a direct replaceBlocks API, 
        // so we'd need to handle this at the page level with a refresh
        console.log('[Collaboration] Remote full sync received');
      }
    });
    
    clearRemoteChanges();
  }, [remoteChanges, clearRemoteChanges]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get block selections from cursors
  const blockSelections = cursors
    .filter(c => c.blockId)
    .map(c => ({
      userId: c.userId,
      userName: c.userName,
      color: c.color,
      blockId: c.blockId!
    }));

  if (!isMounted) {
    return (
      <div className={cn("min-h-[500px] animate-pulse bg-muted/20 rounded-lg", className)} />
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("workspace-editor relative", className)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {/* Collaboration status bar */}
      {enableCollaboration && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            {cursors.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {cursors.length} collaborator{cursors.length !== 1 ? 's' : ''} online
              </span>
            )}
          </div>
          <SyncStatusIndicator
            isSyncing={syncState.isSyncing}
            lastSyncedAt={syncState.lastSyncedAt}
            pendingChanges={syncState.pendingChanges}
            isConnected={isConnected}
            onManualSync={() => broadcastFullSync(editor.document)}
          />
        </div>
      )}
      
      {!readOnly && <EditorToolbar editor={editor} />}
      <div ref={editorRef} className="relative">
        <BlockNoteView
          editor={editor}
          onChange={handleChange}
          editable={!readOnly}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          slashMenu={false}
          sideMenu={false}
        >
          {/* Custom Slash Menu with our blocks + AI command */}
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSlashMenuItems(
                getCustomSlashMenuItems(editor, () => setShowAIDialog(true)), 
                query
              )
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
        
        {/* AI Writing Toolbar - appears on text selection */}
        {!readOnly && (
          <AIWritingToolbar
            editorElement={editorRef.current}
            onApplyText={(newText) => {
              // Replace selected text with AI-generated text
              const selection = window.getSelection();
              if (selection && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(newText));
                selection.removeAllRanges();
              }
              // Trigger content change
              handleChange();
            }}
          />
        )}
      </div>
      
      {/* AI Slash Command Dialog */}
      <AISlashCommandDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        onInsertText={(text) => {
          // Insert generated text at cursor position
          const currentBlock = editor.getTextCursorPosition().block;
          editor.insertBlocks(
            [{ type: 'paragraph', content: text }],
            currentBlock,
            'after'
          );
          handleChange();
        }}
        context={page.title}
      />
      
      {/* Collaborative cursors overlay */}
      {enableCollaboration && containerRef.current && (
        <CollaborativeCursors cursors={cursors} containerRef={containerRef as React.RefObject<HTMLElement>} />
      )}
      
      {/* Block selection highlights */}
      {enableCollaboration && blockSelections.length > 0 && (
        <BlockSelectionHighlight selections={blockSelections} />
      )}
      
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
