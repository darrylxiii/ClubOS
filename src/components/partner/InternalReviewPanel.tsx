import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, Filter, Grid3X3, Loader2, List, Search, SortAsc,
  SortDesc, X, Undo2, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useReviewQueue, type ReviewQueueApplication } from '@/hooks/useReviewQueue';
import { CandidateReviewCard } from './CandidateReviewCard';
import { ReviewSessionStats } from './ReviewSessionStats';
import { ReviewShortcutOverlay } from './ReviewShortcutOverlay';

interface InternalReviewPanelProps {
  jobId: string;
}

type SortKey = 'match' | 'date' | 'name';
type ViewMode = 'card' | 'list';

export const InternalReviewPanel = ({ jobId }: InternalReviewPanelProps) => {
  const {
    internalPending,
    isLoading,
    approveInternalMutation,
    rejectInternalMutation,
  } = useReviewQueue(jobId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortKey, setSortKey] = useState<SortKey>('match');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection dialog
  const [rejectTarget, setRejectTarget] = useState<ReviewQueueApplication | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Undo state
  const [undoAction, setUndoAction] = useState<{ type: string; name: string; timeoutId: number } | null>(null);

  // Session stats
  const [sessionStart] = useState(Date.now());
  const [sessionApproved, setSessionApproved] = useState(0);
  const [sessionRejected, setSessionRejected] = useState(0);

  const isSubmitting = approveInternalMutation.isPending || rejectInternalMutation.isPending;

  // Filtered and sorted list
  const filteredSorted = useMemo(() => {
    let items = [...internalPending];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (a) =>
          a.candidateName.toLowerCase().includes(q) ||
          (a.candidateTitle || '').toLowerCase().includes(q) ||
          a.candidateSkills.some((s) => s.toLowerCase().includes(q)),
      );
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'match') cmp = (b.matchScore ?? 0) - (a.matchScore ?? 0);
      else if (sortKey === 'date') cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      else cmp = a.candidateName.localeCompare(b.candidateName);
      return sortAsc ? -cmp : cmp;
    });

    return items;
  }, [internalPending, searchQuery, sortKey, sortAsc]);

  // Set initial focus
  useEffect(() => {
    if (filteredSorted.length > 0 && !focusedId) {
      setFocusedId(filteredSorted[0].id);
    }
  }, [filteredSorted, focusedId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredSorted.map((a) => a.id));
  };

  const clearSelection = () => setSelectedIds([]);

  const showUndo = (type: string, name: string) => {
    if (undoAction?.timeoutId) clearTimeout(undoAction.timeoutId);
    const timeoutId = window.setTimeout(() => setUndoAction(null), 5000);
    setUndoAction({ type, name, timeoutId });
  };

  const handleApprove = useCallback(
    async (app: ReviewQueueApplication) => {
      await approveInternalMutation.mutateAsync({ application: app });
      setSessionApproved((n) => n + 1);
      setSelectedIds((prev) => prev.filter((id) => id !== app.id));
      showUndo('approved', app.candidateName);
    },
    [approveInternalMutation],
  );

  const handleBulkApprove = async () => {
    const apps = filteredSorted.filter((a) => selectedIds.includes(a.id));
    if (apps.length === 0) {
      toast.error('Select at least one candidate.');
      return;
    }

    const results = await Promise.allSettled(
      apps.map((a) => approveInternalMutation.mutateAsync({ application: a })),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) toast.error(`${failed} of ${results.length} approvals failed.`);
    setSessionApproved((n) => n + (results.length - failed));
    setSelectedIds([]);
    showUndo('bulk approved', `${results.length - failed} candidates`);
  };

  const handleIndividualReject = async () => {
    if (!rejectTarget || !rejectNote.trim()) {
      toast.error('Rejection note is required.');
      return;
    }
    await rejectInternalMutation.mutateAsync({
      application: rejectTarget,
      notes: rejectNote.trim(),
    });
    setSessionRejected((n) => n + 1);
    setSelectedIds((prev) => prev.filter((id) => id !== rejectTarget.id));
    showUndo('rejected', rejectTarget.candidateName);
    setRejectTarget(null);
    setRejectNote('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute('role') === 'combobox';
      if (isTyping) return;

      const focusIdx = filteredSorted.findIndex((a) => a.id === focusedId);

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(focusIdx + 1, filteredSorted.length - 1);
        setFocusedId(filteredSorted[next]?.id || null);
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(focusIdx - 1, 0);
        setFocusedId(filteredSorted[prev]?.id || null);
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (focusedId) toggleSelect(focusedId);
      }
      if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const focused = filteredSorted.find((a) => a.id === focusedId);
        if (focused) void handleApprove(focused);
      }
      if (e.key === 'r') {
        e.preventDefault();
        const focused = filteredSorted.find((a) => a.id === focusedId);
        if (focused) {
          setRejectTarget(focused);
          setRejectNote('');
        }
      }
      if (e.key === 'e') {
        e.preventDefault();
        setExpandedId((prev) => (prev === focusedId ? null : focusedId));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredSorted, focusedId, handleApprove]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (internalPending.length === 0) {
    return (
      <Card className="border-success/20">
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-success/15 flex items-center justify-center">
            <Check className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="font-semibold">All clear</p>
            <p className="text-sm text-muted-foreground">No candidates awaiting internal review.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, title, or skill..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {sortAsc ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
                {sortKey === 'match' ? 'Match' : sortKey === 'date' ? 'Date' : 'Name'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortKey('match'); setSortAsc(false); }}>
                Match Score (High → Low)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('match'); setSortAsc(true); }}>
                Match Score (Low → High)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('date'); setSortAsc(false); }}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('date'); setSortAsc(true); }}>
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('name'); setSortAsc(true); }}>
                Name A → Z
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'card' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Session stats */}
        <ReviewSessionStats
          totalInQueue={internalPending.length}
          currentIndex={0}
          approvedCount={sessionApproved}
          rejectedCount={sessionRejected}
          heldCount={0}
          sessionStartTime={sessionStart}
        />

        {/* Candidate results */}
        <p className="text-xs text-muted-foreground">
          {filteredSorted.length} candidate{filteredSorted.length !== 1 ? 's' : ''}
          {selectedIds.length > 0 && (
            <span className="text-primary font-medium"> · {selectedIds.length} selected</span>
          )}
        </p>

        <div className={cn(
          viewMode === 'card'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
            : 'space-y-2',
        )}>
          {filteredSorted.map((app) => {
            const isSelected = selectedIds.includes(app.id);
            const isFocused = focusedId === app.id;

            return (
              <div
                key={app.id}
                className={cn(
                  'relative group',
                  isFocused && 'ring-2 ring-primary/40 rounded-xl',
                )}
              >
                <CandidateReviewCard
                  application={app}
                  compact={viewMode === 'list'}
                  selected={isSelected}
                  onSelect={() => {
                    setFocusedId(app.id);
                    if (viewMode === 'list') toggleSelect(app.id);
                  }}
                />

                {/* Quick action overlay */}
                {viewMode === 'card' && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(app.id); }}
                      className={cn(
                        'h-6 w-6 rounded-md border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background/80 border-border hover:border-primary/50',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-success hover:bg-success/20"
                      onClick={(e) => { e.stopPropagation(); void handleApprove(app); }}
                      disabled={isSubmitting}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:bg-destructive/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRejectTarget(app);
                        setRejectNote('');
                      }}
                      disabled={isSubmitting}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border/50 rounded-xl shadow-2xl px-5 py-3 animate-fade-in">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button
            size="sm"
            onClick={() => void handleBulkApprove()}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Approve All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearSelection}
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={selectAll}
          >
            Select All
          </Button>
        </div>
      )}

      {/* Undo toast */}
      {undoAction && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-card border border-border/50 rounded-xl shadow-2xl px-4 py-3 animate-fade-in">
          <span className="text-sm">
            <span className="capitalize">{undoAction.type}</span> {undoAction.name}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              // TODO: Implement undo logic via optimistic rollback
              toast.info('Undo is not yet available for this action.');
              setUndoAction(null);
            }}
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </Button>
        </div>
      )}

      {/* Rejection dialog */}
      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectTarget?.candidateName}</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this candidate from the pipeline.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Rejection reason..."
            className="min-h-24"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleIndividualReject()}
              disabled={!rejectNote.trim() || isSubmitting}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewShortcutOverlay mode="internal" />
    </>
  );
};
