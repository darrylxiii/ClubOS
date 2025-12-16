import React, { useMemo } from 'react';
import { DatabaseColumn, DatabaseRow, ColumnType } from '@/hooks/useWorkspaceDatabase';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatabaseBoardViewProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  groupByColumnId?: string;
  onAddColumn: (name: string, type: ColumnType) => Promise<unknown>;
  onUpdateColumn: (columnId: string, updates: Partial<DatabaseColumn>) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onAddRow: (data?: Record<string, unknown>) => Promise<unknown>;
  onUpdateRow: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

export function DatabaseBoardView({
  columns,
  rows,
  groupByColumnId,
  onAddRow,
  onUpdateRow,
}: DatabaseBoardViewProps) {
  // Find the select column to group by (first select column if not specified)
  const groupColumn = useMemo(() => {
    if (groupByColumnId) {
      return columns.find(c => c.id === groupByColumnId);
    }
    return columns.find(c => c.column_type === 'select' || c.column_type === 'multi_select');
  }, [columns, groupByColumnId]);

  // Get the primary column for card titles
  const primaryColumn = columns.find(c => c.is_primary) || columns[0];

  // Get options from the group column
  const options = useMemo(() => {
    if (!groupColumn) return [{ value: 'No Status', color: 'gray' }];
    const opts = (groupColumn.options?.options as Array<{ value: string; color: string }>) || [];
    return [{ value: 'No Status', color: 'gray' }, ...opts];
  }, [groupColumn]);

  // Group rows by the select value
  const groupedRows = useMemo(() => {
    const groups: Record<string, DatabaseRow[]> = {};
    options.forEach(opt => {
      groups[opt.value] = [];
    });

    rows.forEach(row => {
      const value = groupColumn ? (row.data[groupColumn.id] as string) : null;
      const groupKey = value || 'No Status';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });

    return groups;
  }, [rows, groupColumn, options]);

  const handleAddCard = async (groupValue: string) => {
    const data: Record<string, unknown> = {};
    if (groupColumn && groupValue !== 'No Status') {
      data[groupColumn.id] = groupValue;
    }
    await onAddRow(data);
  };

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData('rowId', rowId);
  };

  const handleDrop = async (e: React.DragEvent, groupValue: string) => {
    e.preventDefault();
    const rowId = e.dataTransfer.getData('rowId');
    if (rowId && groupColumn) {
      await onUpdateRow(rowId, { [groupColumn.id]: groupValue === 'No Status' ? null : groupValue });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="p-4 overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {options.map((option) => (
          <div
            key={option.value}
            className="w-64 flex-shrink-0"
            onDrop={(e) => handleDrop(e, option.value)}
            onDragOver={handleDragOver}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    option.color === 'gray' && "bg-gray-400",
                    option.color === 'red' && "bg-red-500",
                    option.color === 'orange' && "bg-orange-500",
                    option.color === 'yellow' && "bg-yellow-500",
                    option.color === 'green' && "bg-green-500",
                    option.color === 'blue' && "bg-blue-500",
                    option.color === 'purple' && "bg-purple-500",
                    option.color === 'pink' && "bg-pink-500",
                  )}
                />
                <span className="text-sm font-medium">{option.value}</span>
                <span className="text-xs text-muted-foreground">
                  {groupedRows[option.value]?.length || 0}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {groupedRows[option.value]?.map((row) => (
                <div
                  key={row.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, row.id)}
                  className="bg-card border border-border rounded-lg p-3 shadow-sm cursor-move hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-medium">
                    {primaryColumn ? (row.data[primaryColumn.id] as string) || 'Untitled' : 'Untitled'}
                  </p>
                  {/* Show other visible fields */}
                  <div className="mt-2 space-y-1">
                    {columns
                      .filter(c => !c.is_primary && c.id !== groupColumn?.id && c.is_visible)
                      .slice(0, 2)
                      .map(col => {
                        const value = row.data[col.id];
                        if (!value) return null;
                        return (
                          <p key={col.id} className="text-xs text-muted-foreground truncate">
                            {col.name}: {String(value)}
                          </p>
                        );
                      })}
                  </div>
                </div>
              ))}

              {/* Add card button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => handleAddCard(option.value)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add card
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
