import React from 'react';
import { DatabaseColumn, DatabaseRow, ColumnType } from '@/hooks/useWorkspaceDatabase';
import { DatabaseCell } from '../cells/DatabaseCell';
import { ColumnHeader } from '../ColumnHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DatabaseTableViewProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  onAddColumn: (name: string, type: ColumnType) => Promise<unknown>;
  onUpdateColumn: (columnId: string, updates: Partial<DatabaseColumn>) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onAddRow: (data?: Record<string, unknown>) => Promise<unknown>;
  onUpdateRow: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

export function DatabaseTableView({
  columns,
  rows,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
}: DatabaseTableViewProps) {
  const visibleColumns = columns.filter(c => c.is_visible);

  const handleCellChange = (rowId: string, columnId: string, value: unknown) => {
    onUpdateRow(rowId, { [columnId]: value });
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {visibleColumns.map((column) => (
              <TableHead 
                key={column.id} 
                style={{ width: column.width }}
                className="border-r border-border last:border-r-0"
              >
                <ColumnHeader
                  column={column}
                  onUpdate={(updates) => onUpdateColumn(column.id, updates)}
                  onDelete={() => onDeleteColumn(column.id)}
                />
              </TableHead>
            ))}
            <TableHead className="w-10">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onAddColumn('New Column', 'text')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="group">
              {visibleColumns.map((column) => (
                <TableCell 
                  key={column.id}
                  className="p-0 border-r border-border last:border-r-0"
                >
                  <DatabaseCell
                    column={column}
                    value={row.data[column.id]}
                    onChange={(value) => handleCellChange(row.id, column.id, value)}
                  />
                </TableCell>
              ))}
              <TableCell className="w-10 p-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => onDeleteRow(row.id)}
                >
                  ×
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {/* Add row button */}
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={visibleColumns.length + 1} className="p-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-4 text-muted-foreground"
                onClick={() => onAddRow()}
              >
                <Plus className="h-4 w-4 mr-2" />
                New row
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
