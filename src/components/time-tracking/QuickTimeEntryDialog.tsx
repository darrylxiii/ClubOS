import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickTimeEntryDialog({ open, onOpenChange }: QuickTimeEntryDialogProps) {
  const { addEntry } = useTimeTracking();
  const [date, setDate] = useState<Date>(new Date());
  const [hours, setHours] = useState("8");
  const [billableHours, setBillableHours] = useState("8");
  const [notes, setNotes] = useState("");
  const [activityLevel, setActivityLevel] = useState("high");

  const handleSubmit = async () => {
    const hoursNum = parseFloat(hours) || 0;
    if (hoursNum <= 0) return;

    await addEntry.mutateAsync({
      date: format(date, 'yyyy-MM-dd'),
      hours_worked: hoursNum,
      billable_hours: parseFloat(billableHours) || hoursNum,
      notes: notes || undefined,
      activity_level: activityLevel,
      source: 'manual',
    });

    // Reset form
    setNotes("");
    setHours("8");
    setBillableHours("8");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Log Time Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Picker */}
          <div>
            <Label className="mb-2 block">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hours" className="mb-2 block">Hours Worked</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                placeholder="8"
                value={hours}
                onChange={(e) => {
                  setHours(e.target.value);
                  setBillableHours(e.target.value);
                }}
              />
            </div>

            <div>
              <Label htmlFor="billable" className="mb-2 block">Billable Hours</Label>
              <Input
                id="billable"
                type="number"
                step="0.5"
                min="0"
                max="24"
                placeholder="8"
                value={billableHours}
                onChange={(e) => setBillableHours(e.target.value)}
              />
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <Label className="mb-2 block">Activity Level</Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High - Fully productive</SelectItem>
                <SelectItem value="medium">Medium - Some interruptions</SelectItem>
                <SelectItem value="low">Low - Many distractions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="mb-2 block">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="What did you work on today?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={parseFloat(hours) <= 0 || addEntry.isPending}
          >
            {addEntry.isPending ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
