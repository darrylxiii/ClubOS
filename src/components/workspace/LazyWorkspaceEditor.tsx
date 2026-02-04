/**
 * LazyWorkspaceEditor - Lazy-loaded wrapper for the heavy BlockNote editor
 * 
 * This wrapper defers loading of @blocknote/core, @blocknote/react, and @blocknote/mantine
 * until the editor is actually needed, saving ~200MB of build memory and ~600KB of initial bundle.
 * 
 * Use this component instead of importing WorkspaceEditor directly.
 */
import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Lazy load the heavy WorkspaceEditor component
const WorkspaceEditorLazy = lazy(() => 
  import('./WorkspaceEditor').then(m => ({ default: m.WorkspaceEditor }))
);

// Editor skeleton that matches the actual editor layout
function EditorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("workspace-editor-skeleton space-y-4", className)}>
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <div className="w-px h-6 bg-border mx-2" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      
      {/* Content skeleton */}
      <div className="px-4 space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <div className="py-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <div className="py-2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

type WorkspaceEditorProps = ComponentProps<typeof WorkspaceEditorLazy>;

export function LazyWorkspaceEditor(props: WorkspaceEditorProps) {
  return (
    <Suspense fallback={<EditorSkeleton className={props.className} />}>
      <WorkspaceEditorLazy {...props} />
    </Suspense>
  );
}

export default LazyWorkspaceEditor;
