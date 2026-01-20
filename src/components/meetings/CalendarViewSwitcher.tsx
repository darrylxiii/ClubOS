import { Button } from "@/components/ui/button";
import { 
  Calendar, CalendarDays, List, Clock, 
  ChevronLeft, ChevronRight 
} from "lucide-react";
import { ExtendedViewMode } from "@/hooks/useCalendarView";
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface CalendarViewSwitcherProps {
  viewMode: ExtendedViewMode;
  onViewChange: (mode: ExtendedViewMode) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function CalendarViewSwitcher({
  viewMode,
  onViewChange,
  selectedDate,
  onDateChange,
}: CalendarViewSwitcherProps) {
  
  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate = selectedDate;
    
    switch (viewMode) {
      case 'day':
        newDate = addDays(selectedDate, direction === 'prev' ? -1 : 1);
        break;
      case 'week':
        newDate = addWeeks(selectedDate, direction === 'prev' ? -1 : 1);
        break;
      case 'month':
        newDate = addMonths(selectedDate, direction === 'prev' ? -1 : 1);
        break;
      case 'list':
      case 'timeline':
        newDate = addWeeks(selectedDate, direction === 'prev' ? -1 : 1);
        break;
    }
    
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const getDateRangeText = () => {
    switch (viewMode) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      }
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
      case 'list':
      case 'timeline': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card/40 backdrop-blur-sm rounded-lg border border-border/50">
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => navigateDate('prev')}
          className="h-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={goToToday}
          className="h-9 min-w-[80px]"
        >
          Today
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => navigateDate('next')}
          className="h-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-4 font-semibold text-lg hidden sm:block">
          {getDateRangeText()}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={viewMode === 'day' ? 'default' : 'ghost'}
          onClick={() => onViewChange('day')}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Day</span>
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'week' ? 'default' : 'ghost'}
          onClick={() => onViewChange('week')}
          className="gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Week</span>
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'month' ? 'default' : 'ghost'}
          onClick={() => onViewChange('month')}
          className="gap-2"
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Month</span>
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          onClick={() => onViewChange('list')}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </Button>
      </div>

      <div className="sm:hidden font-semibold text-base w-full text-center">
        {getDateRangeText()}
      </div>
    </div>
  );
}
