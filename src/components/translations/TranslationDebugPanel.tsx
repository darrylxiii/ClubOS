import { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, Trash2, Copy, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  details?: string;
  timestamp: Date;
  source?: string;
}

interface TranslationDebugPanelProps {
  logs: LogEntry[];
  onClear?: () => void;
  className?: string;
}

export function TranslationDebugPanel({ logs, onClear, className }: TranslationDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');

  const filteredLogs = logs.filter(log => filter === 'all' || log.level === filter);
  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  const copyLogs = () => {
    const logText = filteredLogs
      .map(l => `[${l.timestamp.toISOString()}] [${l.level.toUpperCase()}] ${l.message}${l.details ? `\n  ${l.details}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    toast.success('Logs copied to clipboard');
  };

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Debug Console</span>
          {errorCount > 0 && (
            <Badge variant="destructive" className="h-5 text-xs">{errorCount} errors</Badge>
          )}
          {warnCount > 0 && (
            <Badge variant="outline" className="h-5 text-xs border-yellow-500 text-yellow-600">{warnCount} warnings</Badge>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="border-t">
          <div className="flex items-center justify-between p-2 border-b bg-muted/30">
            <div className="flex gap-1">
              <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton>
              <FilterButton active={filter === 'info'} onClick={() => setFilter('info')}>Info</FilterButton>
              <FilterButton active={filter === 'warn'} onClick={() => setFilter('warn')}>Warn</FilterButton>
              <FilterButton active={filter === 'error'} onClick={() => setFilter('error')}>Error</FilterButton>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={copyLogs} className="h-7 px-2">
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
              {onClear && (
                <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2">
                  <Trash2 className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[200px]">
            {filteredLogs.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No logs to display
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredLogs.map((log) => (
                  <LogEntryRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-xs rounded transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

function LogEntryRow({ log }: { log: LogEntry }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div 
      className={cn(
        'p-2 rounded text-xs font-mono',
        log.level === 'error' && 'bg-destructive/10 text-destructive',
        log.level === 'warn' && 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
        log.level === 'info' && 'bg-muted/50'
      )}
    >
      <div className="flex items-start gap-2">
        <LogIcon level={log.level} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {log.timestamp.toLocaleTimeString()}
            </span>
            {log.source && (
              <Badge variant="outline" className="h-4 text-[10px]">{log.source}</Badge>
            )}
          </div>
          <p className="break-words mt-0.5">{log.message}</p>
          {log.details && (
            <>
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-muted-foreground hover:text-foreground mt-1 underline"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
              {showDetails && (
                <pre className="mt-1 p-2 bg-background rounded text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {log.details}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LogIcon({ level }: { level: LogLevel }) {
  switch (level) {
    case 'error':
      return <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />;
    case 'warn':
      return <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />;
    default:
      return <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />;
  }
}
