import React, { useState, useMemo } from 'react';
import { DatabaseColumn, DatabaseRow } from '@/hooks/useWorkspaceDatabase';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, startOfMonth, differenceInDays, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DatabaseTimelineViewProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  onRowUpdate: (rowId: string, data: Record<string, unknown>) => void;
  onRowDelete: (rowId: string) => void;
  onAddRow: () => void;
}

type ZoomLevel = 'day' | 'week' | 'month';

const ZOOM_CONFIGS = {
  day: { cellWidth: 40, unitCount: 31, format: 'd', headerFormat: 'MMM yyyy' },
  week: { cellWidth: 100, unitCount: 12, format: "'W'w", headerFormat: 'MMM yyyy' },
  month: { cellWidth: 120, unitCount: 12, format: 'MMM', headerFormat: 'yyyy' },
};

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500',
];

export function DatabaseTimelineView({
  columns,
  rows,
  onRowUpdate,
  onRowDelete,
  onAddRow,
}: DatabaseTimelineViewProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [viewStartDate, setViewStartDate] = useState(() => startOfMonth(new Date()));
  const [startDateColumn, setStartDateColumn] = useState<string>('');
  const [endDateColumn, setEndDateColumn] = useState<string>('');
  const [draggingItem, setDraggingItem] = useState<{ rowId: string; type: 'move' | 'resize-start' | 'resize-end'; startX: number } | null>(null);

  // Get date columns
  const dateColumns = columns.filter(col => 
    col.column_type === 'date' || col.column_type === 'created_time' || col.column_type === 'updated_time'
  );

  // Get title column (first text column or column named 'title'/'name')
  const titleColumn = columns.find(col => 
    col.name.toLowerCase() === 'title' || col.name.toLowerCase() === 'name'
  ) || columns.find(col => col.column_type === 'text');

  const config = ZOOM_CONFIGS[zoomLevel];

  // Generate timeline units
  const timelineUnits = useMemo(() => {
    const units: Date[] = [];
    let current = viewStartDate;
    
    for (let i = 0; i < config.unitCount; i++) {
      units.push(current);
      if (zoomLevel === 'day') current = addDays(current, 1);
      else if (zoomLevel === 'week') current = addWeeks(current, 1);
      else current = addMonths(current, 1);
    }
    
    return units;
  }, [viewStartDate, zoomLevel, config.unitCount]);

  const viewEndDate = timelineUnits[timelineUnits.length - 1];
  const totalWidth = timelineUnits.length * config.cellWidth;

  // Process rows into timeline items
  const timelineItems = useMemo(() => {
    if (!startDateColumn) return [];

    return rows.map((row, index) => {
      const data = row.data as Record<string, unknown>;
      const startDate = data[startDateColumn] ? parseISO(String(data[startDateColumn])) : null;
      const endDate = endDateColumn && data[endDateColumn] 
        ? parseISO(String(data[endDateColumn])) 
        : startDate 
          ? addDays(startDate, 1) 
          : null;

      if (!startDate) return null;

      const title = titleColumn ? String(data[titleColumn.name] || 'Untitled') : 'Untitled';
      const color = COLORS[index % COLORS.length];

      // Calculate position
      const daysDiff = differenceInDays(startDate, viewStartDate);
      const duration = endDate ? differenceInDays(endDate, startDate) : 1;
      
      let left = 0;
      let width = 0;

      if (zoomLevel === 'day') {
        left = daysDiff * config.cellWidth;
        width = Math.max(duration, 1) * config.cellWidth;
      } else if (zoomLevel === 'week') {
        left = (daysDiff / 7) * config.cellWidth;
        width = Math.max(duration / 7, 0.5) * config.cellWidth;
      } else {
        left = (daysDiff / 30) * config.cellWidth;
        width = Math.max(duration / 30, 0.5) * config.cellWidth;
      }

      return {
        rowId: row.id,
        title,
        startDate,
        endDate,
        left,
        width: Math.max(width, 20),
        color,
        data,
      };
    }).filter(Boolean);
  }, [rows, startDateColumn, endDateColumn, titleColumn, viewStartDate, zoomLevel, config.cellWidth]);

  const navigatePrevious = () => {
    if (zoomLevel === 'day') setViewStartDate(prev => addDays(prev, -14));
    else if (zoomLevel === 'week') setViewStartDate(prev => addWeeks(prev, -4));
    else setViewStartDate(prev => addMonths(prev, -3));
  };

  const navigateNext = () => {
    if (zoomLevel === 'day') setViewStartDate(prev => addDays(prev, 14));
    else if (zoomLevel === 'week') setViewStartDate(prev => addWeeks(prev, 4));
    else setViewStartDate(prev => addMonths(prev, 3));
  };

  const handleToday = () => {
    setViewStartDate(startOfMonth(new Date()));
  };

  const handleDragStart = (e: React.MouseEvent, rowId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    setDraggingItem({ rowId, type, startX: e.clientX });
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
  };

  if (dateColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Calendar className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No date columns found</p>
        <p className="text-sm">Add a date column to use timeline view</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Select value={startDateColumn} onValueChange={setStartDateColumn}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Start date" />
            </SelectTrigger>
            <SelectContent>
              {dateColumns.map(col => (
                <SelectItem key={col.id} value={col.name}>{col.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <span className="text-xs text-muted-foreground">to</span>
          
          <Select value={endDateColumn} onValueChange={setEndDateColumn}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="End date (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {dateColumns.map(col => (
                <SelectItem key={col.id} value={col.name}>{col.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <div className="flex items-center border rounded-md overflow-hidden">
            {(['day', 'week', 'month'] as ZoomLevel[]).map(level => (
              <Button
                key={level}
                variant={zoomLevel === level ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-3 text-xs capitalize"
                onClick={() => setZoomLevel(level)}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {!startDateColumn ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Select a start date column to view timeline</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="min-w-max">
            {/* Timeline header */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="flex" style={{ marginLeft: 200 }}>
                {timelineUnits.map((date, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 border-r text-center py-2"
                    style={{ width: config.cellWidth }}
                  >
                    <div className="text-[10px] text-muted-foreground">
                      {format(date, config.headerFormat)}
                    </div>
                    <div className="text-xs font-medium">
                      {format(date, config.format)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline rows */}
            <div className="relative">
              {/* Grid lines */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ marginLeft: 200 }}
              >
                <div className="flex h-full">
                  {timelineUnits.map((_, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 border-r border-dashed border-muted"
                      style={{ width: config.cellWidth }}
                    />
                  ))}
                </div>
              </div>

              {/* Row labels and items */}
              {rows.map((row, rowIndex) => {
                const data = row.data as Record<string, unknown>;
                const title = titleColumn ? String(data[titleColumn.name] || 'Untitled') : 'Untitled';
                const item = timelineItems.find(i => i?.rowId === row.id);

                return (
                  <div
                    key={row.id}
                    className="flex items-center h-10 border-b hover:bg-muted/30"
                  >
                    {/* Row label */}
                    <div className="w-[200px] flex-shrink-0 px-3 truncate text-sm border-r bg-background sticky left-0 z-[5]">
                      {title}
                    </div>

                    {/* Timeline area */}
                    <div className="relative flex-1 h-full" style={{ width: totalWidth }}>
                      {item && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-1 bottom-1 rounded cursor-move group",
                                item.color,
                                "hover:ring-2 hover:ring-primary/50"
                              )}
                              style={{
                                left: Math.max(item.left, 0),
                                width: item.width,
                              }}
                              onMouseDown={(e) => handleDragStart(e, row.id, 'move')}
                            >
                              {/* Resize handles */}
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/50"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, row.id, 'resize-start');
                                }}
                              />
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/50"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, row.id, 'resize-end');
                                }}
                              />
                              
                              {/* Item label */}
                              <div className="px-2 h-full flex items-center">
                                <span className="text-xs text-white font-medium truncate">
                                  {item.title}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-1">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-muted-foreground">
                                {format(item.startDate, 'MMM d, yyyy')}
                                {item.endDate && ` - ${format(item.endDate, 'MMM d, yyyy')}`}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add row button */}
              <div className="flex items-center h-10 border-b">
                <div className="w-[200px] flex-shrink-0 px-3 border-r bg-background sticky left-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onAddRow}
                  >
                    + New
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
