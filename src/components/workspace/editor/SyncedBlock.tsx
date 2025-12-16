import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect } from 'react';
import { RefreshCw, Link2, Unlink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Simple synced block using localStorage for now (can be upgraded to database later)
export const SyncedBlock = createReactBlockSpec(
  {
    type: 'syncedBlock',
    propSchema: {
      syncId: {
        default: '',
      },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const [isLinked, setIsLinked] = useState(false);
      
      const syncId = props.block.props.syncId as string;

      useEffect(() => {
        if (syncId) {
          setIsLinked(true);
        }
      }, [syncId]);

      const handleCreateSyncedBlock = () => {
        const newId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        props.editor.updateBlock(props.block, {
          props: { syncId: newId },
        });
        setIsLinked(true);
        toast.success('Synced block created! Copy the ID to reference elsewhere.');
      };

      const handleCopyId = () => {
        if (syncId) {
          navigator.clipboard.writeText(syncId);
          toast.success('Sync ID copied to clipboard');
        }
      };

      const handleUnlink = () => {
        props.editor.updateBlock(props.block, {
          props: { syncId: '' },
        });
        setIsLinked(false);
        toast.success('Block unlinked');
      };

      return (
        <div
          className={cn(
            "relative rounded-lg border my-2 transition-all",
            isLinked 
              ? "border-primary/30 bg-primary/5" 
              : "border-dashed border-muted-foreground/30 bg-muted/20"
          )}
        >
          {/* Sync indicator bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b text-xs">
            <div className="flex items-center gap-2">
              {isLinked ? (
                <>
                  <RefreshCw className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Synced Block</span>
                  <Badge variant="secondary" className="h-4 text-[10px]">
                    {syncId.slice(0, 12)}...
                  </Badge>
                </>
              ) : (
                <>
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Create Synced Block</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1" contentEditable={false}>
              {isLinked ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs"
                    onClick={handleCopyId}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy ID
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                    onClick={handleUnlink}
                  >
                    <Unlink className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={handleCreateSyncedBlock}
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  Create Sync
                </Button>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="p-3">
            <div ref={props.contentRef} className="synced-block-content min-h-[1.5em]" />
          </div>
        </div>
      );
    },
  }
);
