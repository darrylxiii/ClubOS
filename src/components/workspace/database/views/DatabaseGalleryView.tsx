import React from 'react';
import { DatabaseColumn, DatabaseRow, ColumnType } from '@/hooks/useWorkspaceDatabase';
import { Button } from '@/components/ui/button';
import { Plus, Image as ImageIcon } from 'lucide-react';

interface DatabaseGalleryViewProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  onAddColumn: (name: string, type: ColumnType) => Promise<unknown>;
  onUpdateColumn: (columnId: string, updates: Partial<DatabaseColumn>) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onAddRow: (data?: Record<string, unknown>) => Promise<unknown>;
  onUpdateRow: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

export function DatabaseGalleryView({
  columns,
  rows,
  onAddRow,
}: DatabaseGalleryViewProps) {
  const primaryColumn = columns.find(c => c.is_primary) || columns[0];
  const urlColumn = columns.find(c => c.column_type === 'url');

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {rows.map((row) => {
          const title = primaryColumn ? (row.data[primaryColumn.id] as string) : 'Untitled';
          const imageUrl = urlColumn ? (row.data[urlColumn.id] as string) : null;

          return (
            <div
              key={row.id}
              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Image/Preview area */}
              <div className="aspect-video bg-muted flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title || 'Gallery item'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* Card content */}
              <div className="p-3">
                <p className="text-sm font-medium truncate">
                  {title || 'Untitled'}
                </p>
                {/* Show additional fields */}
                <div className="mt-1 space-y-0.5">
                  {columns
                    .filter(c => !c.is_primary && c.column_type !== 'url' && c.is_visible)
                    .slice(0, 2)
                    .map(col => {
                      const value = row.data[col.id];
                      if (!value) return null;
                      return (
                        <p key={col.id} className="text-xs text-muted-foreground truncate">
                          {String(value)}
                        </p>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add card */}
        <Button
          variant="outline"
          className="aspect-video h-auto flex-col gap-2 border-dashed"
          onClick={() => onAddRow()}
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm">Add item</span>
        </Button>
      </div>
    </div>
  );
}
