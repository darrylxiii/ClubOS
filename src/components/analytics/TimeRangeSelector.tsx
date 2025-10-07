import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type TimeRange = "1h" | "3h" | "12h" | "today" | "yesterday" | "3d" | "7d" | "14d" | "30d" | "3m" | "6m" | "12m" | "custom";

interface TimeRangeSelectorProps {
  value: TimeRange;
  customRange?: { from: Date; to: Date };
  onChange: (range: TimeRange, customRange?: { from: Date; to: Date }) => void;
}

const timeRangeLabels: Record<TimeRange, string> = {
  "1h": "Last Hour",
  "3h": "Last 3 Hours",
  "12h": "Last 12 Hours",
  "today": "Today",
  "yesterday": "Yesterday",
  "3d": "Last 3 Days",
  "7d": "Last 7 Days",
  "14d": "Last 14 Days",
  "30d": "Last 30 Days",
  "3m": "Last 3 Months",
  "6m": "Last 6 Months",
  "12m": "Last Year",
  "custom": "Custom Range",
};

export const TimeRangeSelector = ({ value, customRange, onChange }: TimeRangeSelectorProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customRange ? { from: customRange.from, to: customRange.to } : undefined
  );

  const quickRanges: TimeRange[] = ["1h", "3h", "12h", "today", "yesterday", "3d", "7d", "14d", "30d", "3m", "6m", "12m"];

  const handleCustomRangeSelect = () => {
    if (dateRange?.from && dateRange?.to) {
      onChange("custom", { from: dateRange.from, to: dateRange.to });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {quickRanges.map((range) => (
          <Button
            key={range}
            variant={value === range ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(range)}
          >
            {timeRangeLabels[range]}
          </Button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={value === "custom" ? "default" : "outline"}
            className={cn("w-full justify-start text-left font-normal")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value === "custom" && customRange
              ? `${format(customRange.from, "PP")} - ${format(customRange.to, "PP")}`
              : "Custom Range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
          />
          <div className="p-3 border-t">
            <Button
              onClick={handleCustomRangeSelect}
              disabled={!dateRange?.from || !dateRange?.to}
              className="w-full"
            >
              Apply Custom Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};