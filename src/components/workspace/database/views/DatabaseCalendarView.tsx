import React, { useMemo, useState } from 'react';
import { DatabaseColumn, DatabaseRow } from '@/hooks/useWorkspaceDatabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isValid,
} from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DatabaseCalendarViewProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  onAddRow: (data?: Record<string, unknown>) => Promise<unknown>;
  onUpdateRow: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
}

export function DatabaseCalendarView({
  columns,
  rows,
  onAddRow,
  onUpdateRow,
}: DatabaseCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateColumn, setSelectedDateColumn] = useState<string | null>(null);

  // Find date columns
  const dateColumns = columns.filter(c => c.column_type === 'date');
  const titleColumn = columns.find(c => c.is_primary) || columns[0];

  // Auto-select first date column if none selected
  const activeDateColumn = selectedDateColumn || dateColumns[0]?.id;

  // Get calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group rows by date
  const rowsByDate = useMemo(() => {
    const map = new Map<string, DatabaseRow[]>();
    
    if (!activeDateColumn) return map;
    
    rows.forEach(row => {
      const dateValue = row.data[activeDateColumn];
      if (!dateValue) return;
      
      let date: Date;
      if (typeof dateValue === 'string') {
        date = parseISO(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        return;
      }
      
      if (!isValid(date)) return;
      
      const key = format(date, 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      map.set(key, [...existing, row]);
    });
    
    return map;
  }, [rows, activeDateColumn]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleAddEventOnDate = async (date: Date) => {
    if (!activeDateColumn) return;
    await onAddRow({ [activeDateColumn]: format(date, 'yyyy-MM-dd') });
  };

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData('rowId', rowId);
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const rowId = e.dataTransfer.getData('rowId');
    if (!rowId || !activeDateColumn) return;
    await onUpdateRow(rowId, { [activeDateColumn]: format(date, 'yyyy-MM-dd') });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (dateColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-2">No date columns found</p>
        <p className="text-sm text-muted-foreground">
          Add a date column to use the calendar view
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {dateColumns.length > 1 && (
          <Select value={activeDateColumn || ''} onValueChange={setSelectedDateColumn}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date column" />
            </SelectTrigger>
            <SelectContent>
              {dateColumns.map(col => (
                <SelectItem key={col.id} value={col.id}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayRows = rowsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dateKey}
                className={cn(
                  "min-h-[100px] border-r border-b last:border-r-0 p-1",
                  !isCurrentMonth && "bg-muted/30",
                  isToday && "bg-primary/5"
                )}
                onDrop={(e) => handleDrop(e, day)}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground",
                    !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 opacity-0 hover:opacity-100 focus:opacity-100"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <Button 
                        size="sm"
                        onClick={() => handleAddEventOnDate(day)}
                      >
                        Add event on {format(day, 'MMM d')}
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayRows.slice(0, 3).map(row => (
                    <div
                      key={row.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, row.id)}
                      className={cn(
                        "text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-move",
                        "hover:bg-primary/20 transition-colors"
                      )}
                      title={String(row.data[titleColumn?.id || ''] || 'Untitled')}
                    >
                      {String(row.data[titleColumn?.id || ''] || 'Untitled')}
                    </div>
                  ))}
                  {dayRows.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{dayRows.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
