import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ManualTimeEntryProps {
  contractId: string;
  hourlyRate: number;
  onSave: (entry: {
    date: Date;
    startTime: string;
    endTime: string;
    hours: number;
    description: string;
    isBillable: boolean;
  }) => Promise<void>;
}

export function ManualTimeEntry({ contractId, hourlyRate, onSave }: ManualTimeEntryProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateHours = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  const hours = calculateHours();
  const earnings = hours * hourlyRate;

  const handleSubmit = async () => {
    if (!description || hours <= 0) {
      alert("Please fill in all fields with valid time range");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        date,
        startTime,
        endTime,
        hours,
        description,
        isBillable
      });

      // Reset form
      setDescription("");
      setStartTime("09:00");
      setEndTime("17:00");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time options (30-minute intervals)
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  return (
    <Card className="p-6 border border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Plus className="h-5 w-5" />
        Manual Time Entry
      </h3>

      <div className="space-y-4">
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

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">Start Time</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">End Time</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Hours Summary */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Hours:</span>
            <span className="font-semibold text-foreground">{hours.toFixed(2)}h</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Earnings:</span>
            <span className="font-semibold text-foreground">
              €{earnings.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Task Description */}
        <div>
          <Label htmlFor="manual-desc" className="mb-2 block">
            What did you work on?
          </Label>
          <Textarea
            id="manual-desc"
            placeholder="Describe the work completed during this time..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Billable Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="manual-billable" className="cursor-pointer">
              Billable Time
            </Label>
          </div>
          <Switch
            id="manual-billable"
            checked={isBillable}
            onCheckedChange={setIsBillable}
          />
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || !description || hours <= 0}
        >
          {isSubmitting ? "Saving..." : "Add Time Entry"}
        </Button>
      </div>
    </Card>
  );
}
