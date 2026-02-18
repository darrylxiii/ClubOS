import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock } from "lucide-react";

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export type WeekSchedule = Record<string, DaySchedule>;

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const DEFAULT_SCHEDULE: WeekSchedule = Object.fromEntries(
  DAYS.map((d) => [
    d.key,
    {
      enabled: !["saturday", "sunday"].includes(d.key),
      start: "09:00",
      end: "17:00",
    },
  ])
);

interface WeeklyAvailabilityGridProps {
  value?: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
}

export function WeeklyAvailabilityGrid({
  value,
  onChange,
}: WeeklyAvailabilityGridProps) {
  const schedule = value || DEFAULT_SCHEDULE;

  const updateDay = (day: string, update: Partial<DaySchedule>) => {
    onChange({
      ...schedule,
      [day]: { ...schedule[day], ...update },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5" />
          Weekly Availability
        </CardTitle>
        <CardDescription>Set your available hours for each day of the week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const ds = schedule[day.key] || { enabled: false, start: "09:00", end: "17:00" };
            return (
              <div
                key={day.key}
                className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
              >
                <div className="w-12 flex items-center gap-2">
                  <Switch
                    checked={ds.enabled}
                    onCheckedChange={(checked) => updateDay(day.key, { enabled: checked })}
                    aria-label={`Toggle ${day.label}`}
                  />
                </div>
                <span className="w-10 text-sm font-medium text-foreground">{day.label}</span>
                {ds.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={ds.start}
                      onChange={(e) => updateDay(day.key, { start: e.target.value })}
                      className="h-8 text-xs w-28"
                      aria-label={`${day.label} start time`}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={ds.end}
                      onChange={(e) => updateDay(day.key, { end: e.target.value })}
                      className="h-8 text-xs w-28"
                      aria-label={`${day.label} end time`}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
