import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Repeat } from "lucide-react";

export interface RecurrenceConfig {
  enabled: boolean;
  frequency: "weekly" | "biweekly" | "monthly";
  occurrences: number;
}

interface RecurringBookingToggleProps {
  value: RecurrenceConfig;
  onChange: (config: RecurrenceConfig) => void;
}

export function RecurringBookingToggle({ value, onChange }: RecurringBookingToggleProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="recurring"
          checked={value.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...value, enabled: checked as boolean })
          }
        />
        <label
          htmlFor="recurring"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5"
        >
          <Repeat className="h-3.5 w-3.5" />
          Make this a recurring meeting
        </label>
      </div>

      {value.enabled && (
        <div className="pl-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Frequency</Label>
              <Select
                value={value.frequency}
                onValueChange={(freq) =>
                  onChange({ ...value, frequency: freq as RecurrenceConfig["frequency"] })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Occurrences</Label>
              <Input
                type="number"
                min={2}
                max={52}
                value={value.occurrences}
                onChange={(e) =>
                  onChange({ ...value, occurrences: Math.min(52, Math.max(2, parseInt(e.target.value) || 2)) })
                }
                className="h-9 text-xs"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This will schedule {value.occurrences} meetings{" "}
            {value.frequency === "weekly" ? "every week" : value.frequency === "biweekly" ? "every 2 weeks" : "every month"}.
          </p>
        </div>
      )}
    </div>
  );
}
