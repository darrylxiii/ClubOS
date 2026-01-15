import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarFilters } from "@/types/calendar";
import { Star, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarSidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  filters: CalendarFilters;
  onToggleFilter: (source: keyof CalendarFilters) => void;
  onRefresh: () => void;
}

export function CalendarSidebar({
  selectedDate,
  onDateSelect,
  filters,
  onToggleFilter,
  onRefresh,
}: CalendarSidebarProps) {
  return (
    <div className="space-y-6">
      <Card className="p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          className="rounded-md"
        />
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Calendars</h3>
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <Label htmlFor="quantum-club" className="cursor-pointer">
                Quantum Club
              </Label>
            </div>
            <Switch
              id="quantum-club"
              checked={filters.quantum_club}
              onCheckedChange={() => onToggleFilter('quantum_club')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <Label htmlFor="google" className="cursor-pointer">
                Google Calendar
              </Label>
            </div>
            <Switch
              id="google"
              checked={filters.google}
              onCheckedChange={() => onToggleFilter('google')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <Label htmlFor="microsoft" className="cursor-pointer">
                Microsoft Calendar
              </Label>
            </div>
            <Switch
              id="microsoft"
              checked={filters.microsoft}
              onCheckedChange={() => onToggleFilter('microsoft')}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
