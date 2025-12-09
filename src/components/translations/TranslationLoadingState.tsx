import { CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QueryState {
  status: QueryStatus;
  label: string;
  count?: number;
  error?: string;
  duration?: number;
}

interface TranslationLoadingStateProps {
  queries: QueryState[];
  onRetry?: (label: string) => void;
  className?: string;
}

export function TranslationLoadingState({ queries, onRetry, className }: TranslationLoadingStateProps) {
  const allLoaded = queries.every(q => q.status === 'success');
  const hasErrors = queries.some(q => q.status === 'error');
  const isLoading = queries.some(q => q.status === 'loading');

  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">System Status</h3>
        {allLoaded && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> All systems ready
          </span>
        )}
        {hasErrors && (
          <span className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Some queries failed
          </span>
        )}
        {isLoading && !hasErrors && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading...
          </span>
        )}
      </div>

      <div className="space-y-2">
        {queries.map((query) => (
          <QueryStatusRow 
            key={query.label} 
            query={query} 
            onRetry={onRetry ? () => onRetry(query.label) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function QueryStatusRow({ query, onRetry }: { query: QueryState; onRetry?: () => void }) {
  return (
    <div className={cn(
      'flex items-center justify-between py-2 px-3 rounded-md text-sm',
      query.status === 'error' && 'bg-destructive/10',
      query.status === 'success' && 'bg-green-500/5',
      query.status === 'loading' && 'bg-muted/50'
    )}>
      <div className="flex items-center gap-2">
        <StatusIcon status={query.status} />
        <span className={cn(
          'font-medium',
          query.status === 'error' && 'text-destructive',
          query.status === 'success' && 'text-green-600'
        )}>
          {query.label}
        </span>
        {query.count !== undefined && query.status === 'success' && (
          <span className="text-muted-foreground">({query.count})</span>
        )}
        {query.duration !== undefined && query.status === 'success' && (
          <span className="text-xs text-muted-foreground">{query.duration}ms</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {query.status === 'error' && (
          <>
            <span className="text-xs text-destructive max-w-[200px] truncate" title={query.error}>
              {query.error}
            </span>
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2">
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: QueryStatus }) {
  switch (status) {
    case 'loading':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
  }
}
