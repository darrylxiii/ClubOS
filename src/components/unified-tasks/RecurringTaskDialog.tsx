import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Repeat, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

interface RecurringTaskDialogProps {
  taskId: string;
  currentRule: RecurrenceRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const RecurringTaskDialog = ({ 
  taskId, 
  currentRule, 
  open, 
  onOpenChange, 
  onSaved 
}: RecurringTaskDialogProps) => {
  const [frequency, setFrequency] = useState<string>(currentRule?.frequency || 'weekly');
  const [interval, setInterval] = useState(currentRule?.interval || 1);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const recurrenceRule = {
        frequency: frequency,
        interval: interval
      };

      const { error } = await supabase
        .from("unified_tasks")
        .update({
          recurrence_rule: recurrenceRule as any,
          recurrence_end_date: endDate?.toISOString() || null
        })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Recurrence rule saved");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving recurrence:", error);
      toast.error("Failed to save recurrence rule");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("unified_tasks")
        .update({
          recurrence_rule: null,
          recurrence_end_date: null,
          next_occurrence: null
        })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Recurrence removed");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error removing recurrence:", error);
      toast.error("Failed to remove recurrence");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Set Recurrence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Repeat every</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={30}
                value={interval}
                onChange={e => setInterval(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-muted-foreground">
                {frequency === 'daily' && (interval === 1 ? 'day' : 'days')}
                {frequency === 'weekly' && (interval === 1 ? 'week' : 'weeks')}
                {frequency === 'monthly' && (interval === 1 ? 'month' : 'months')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>End Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "No end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Preview</p>
            <p className="text-muted-foreground">
              Repeats every {interval} {frequency.replace('ly', interval === 1 ? '' : 's')}
              {endDate ? ` until ${format(endDate, "MMM d, yyyy")}` : ' indefinitely'}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {currentRule && (
            <Button 
              variant="outline" 
              onClick={handleRemove} 
              disabled={saving}
              className="text-destructive hover:text-destructive"
            >
              Remove Recurrence
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
