import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  yearOptions: number[];
  availableYears?: { year: number; hasRevenue: boolean }[];
}

export function YearSelector({ 
  selectedYear, 
  onYearChange, 
  yearOptions,
  availableYears 
}: YearSelectorProps) {
  const hasData = (year: number) => {
    return availableYears?.some(y => y.year === year && y.hasRevenue);
  };

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={selectedYear.toString()} 
        onValueChange={(value) => onYearChange(parseInt(value, 10))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              <div className="flex items-center gap-2">
                <span>{year}</span>
                {hasData(year) && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    data
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
