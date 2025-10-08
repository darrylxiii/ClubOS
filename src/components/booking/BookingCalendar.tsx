import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface BookingCalendarProps {
  bookingLink: {
    advance_booking_days: number;
    min_notice_hours: number;
  };
  onDateSelect: (date: Date) => void;
}

export function BookingCalendar({ bookingLink, onDateSelect }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate minimum date (considering min notice)
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + bookingLink.min_notice_hours);
  minDate.setHours(0, 0, 0, 0);

  // Calculate maximum date
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + bookingLink.advance_booking_days);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect(date);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Select a Date</h3>
        <p className="text-sm text-muted-foreground">
          Choose a date for your appointment
        </p>
      </div>

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleSelect}
        disabled={(date) => {
          // Disable dates before min notice period
          if (date < minDate) return true;
          // Disable dates beyond advance booking period
          if (date > maxDate) return true;
          return false;
        }}
        className={cn("rounded-md border pointer-events-auto")}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
      />

      <p className="mt-4 text-xs text-muted-foreground text-center max-w-md">
        Available dates are shown. Minimum {bookingLink.min_notice_hours} hours notice required.
      </p>
    </div>
  );
}
