import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Clock, CalendarIcon, Sun, Calendar as CalendarWeek } from 'lucide-react';
import { addDays, addHours, startOfTomorrow, nextMonday } from 'date-fns';
import { cn } from '@/lib/utils';

interface SnoozeDialogProps {
  open: boolean;
  onClose: () => void;
  onSnooze: (date: Date) => void;
}

const quickOptions = [
  { label: 'Later Today', icon: Clock, getValue: () => addHours(new Date(), 4) },
  { label: 'Tomorrow', icon: Sun, getValue: () => startOfTomorrow() },
  { label: 'Next Week', icon: CalendarWeek, getValue: () => nextMonday(new Date()) },
];

export function SnoozeDialog({ open, onClose, onSnooze }: SnoozeDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleQuickOption = (getValue: () => Date) => {
    onSnooze(getValue());
    onClose();
  };

  const handleCustomDate = () => {
    if (selectedDate) {
      onSnooze(selectedDate);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Snooze Until
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {quickOptions.map(({ label, icon: Icon, getValue }) => (
            <Button
              key={label}
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => handleQuickOption(getValue)}
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              {label}
            </Button>
          ))}

          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-3 h-12",
              showCalendar && "bg-primary/10 border-primary"
            )}
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            Pick a Date
          </Button>

          {showCalendar && (
            <div className="border rounded-lg p-3 bg-muted/20">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md"
              />
              {selectedDate && (
                <Button className="w-full mt-3" onClick={handleCustomDate}>
                  Snooze until {selectedDate.toLocaleDateString()}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
