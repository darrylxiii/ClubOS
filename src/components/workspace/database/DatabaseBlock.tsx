import React, { useState, useMemo } from 'react';
import { useWorkspaceDatabase, ViewType } from '@/hooks/useWorkspaceDatabase';
import { DatabaseTableView } from './views/DatabaseTableView';
import { DatabaseBoardView } from './views/DatabaseBoardView';
import { DatabaseGalleryView } from './views/DatabaseGalleryView';
import { DatabaseCalendarView } from './views/DatabaseCalendarView';
import { DatabaseTimelineView } from './views/DatabaseTimelineView';
import { DatabaseViewSwitcher } from './DatabaseViewSwitcher';
import { DatabaseFilterBar, FilterCondition, applyFilters } from './DatabaseFilterBar';
import { DatabaseSortMenu, SortCondition, applySorts } from './DatabaseSortMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Database, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatabaseBlockProps {
  databaseId?: string;
  pageId: string;
  onDatabaseCreated?: (id: string) => void;
  className?: string;
}

export function DatabaseBlock({ databaseId, pageId, onDatabaseCreated, className }: DatabaseBlockProps) {
  const [localDbId, setLocalDbId] = useState(databaseId);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sorts, setSorts] = useState<SortCondition[]>([]);
  
  const {
    database,
    columns,
    rows,
    views,
    activeView,
    activeViewId,
    setActiveViewId,
    isLoading,
    createDatabase,
    addColumn,
    updateColumn,
    deleteColumn,
    addRow,
    updateRow,
    deleteRow,
    addView,
  } = useWorkspaceDatabase(localDbId);

  const [isCreating, setIsCreating] = useState(false);
  const [dbName, setDbName] = useState('');

  // Apply filters and sorts to rows
  const processedRows = useMemo(() => {
    let result = rows;
    result = applyFilters(result, filters);
    result = applySorts(result, sorts);
    return result;
  }, [rows, filters, sorts]);

  const handleCreateDatabase = async () => {
    setIsCreating(true);
    const id = await createDatabase(pageId, dbName || 'Untitled Database');
    if (id) {
      setLocalDbId(id);
      onDatabaseCreated?.(id);
    }
    setIsCreating(false);
  };

  // If no database yet, show creation UI
  if (!localDbId) {
    return (
      <div className={cn("border border-dashed border-border rounded-lg p-6 bg-muted/30", className)}>
        <div className="flex flex-col items-center gap-4">
          <Database className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Create an inline database</p>
          <div className="flex gap-2 w-full max-w-xs">
            <Input
              placeholder="Database name..."
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDatabase()}
            />
            <Button onClick={handleCreateDatabase} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderView = () => {
    if (!activeView) return null;

    const viewProps = {
      columns,
      rows: processedRows,
      onAddColumn: addColumn,
      onUpdateColumn: updateColumn,
      onDeleteColumn: deleteColumn,
      onAddRow: addRow,
      onUpdateRow: updateRow,
      onDeleteRow: deleteRow,
    };

    // Timeline-specific props
    const timelineProps = {
      columns,
      rows: processedRows,
      onRowUpdate: (rowId: string, data: Record<string, unknown>) => updateRow(rowId, data),
      onRowDelete: deleteRow,
      onAddRow: addRow,
    };

    switch (activeView.view_type) {
      case 'table':
        return <DatabaseTableView {...viewProps} />;
      case 'board':
        return <DatabaseBoardView {...viewProps} groupByColumnId={activeView.config?.groupBy as string} />;
      case 'gallery':
        return <DatabaseGalleryView {...viewProps} />;
      case 'calendar':
        return <DatabaseCalendarView {...viewProps} />;
      case 'timeline':
        return <DatabaseTimelineView {...timelineProps} />;
      default:
        return <DatabaseTableView {...viewProps} />;
    }
  };

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden bg-card", className)}>
      {/* Database Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{database?.name || 'Database'}</span>
        </div>
        <DatabaseViewSwitcher
          views={views}
          activeViewId={activeViewId}
          onViewChange={setActiveViewId}
          onAddView={addView}
        />
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/10">
        <DatabaseFilterBar
          columns={columns}
          filters={filters}
          onFiltersChange={setFilters}
        />
        <DatabaseSortMenu
          columns={columns}
          sorts={sorts}
          onSortsChange={setSorts}
        />
        {(filters.length > 0 || sorts.length > 0) && (
          <span className="text-xs text-muted-foreground ml-2">
            {processedRows.length} of {rows.length} rows
          </span>
        )}
      </div>

      {/* Database Content */}
      <div className="min-h-[200px]">
        {renderView()}
      </div>
    </div>
  );
}
