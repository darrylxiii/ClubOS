import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export interface DateOverride {
  id?: string;
  date: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

interface DateOverrideManagerProps {
  overrides: DateOverride[];
  onChange: (overrides: DateOverride[]) => void;
}

export function DateOverrideManager({ overrides, onChange }: DateOverrideManagerProps) {
  const { t } = useTranslation('common');
  const [newOverride, setNewOverride] = useState<DateOverride>({
    date: "",
    is_available: false,
    start_time: "09:00",
    end_time: "17:00",
  });

  const addOverride = () => {
    if (!newOverride.date) return;
    // Check for duplicates
    if (overrides.some((o) => o.date === newOverride.date)) {
      return;
    }
    onChange([...overrides, { ...newOverride }]);
    setNewOverride({ date: "", is_available: false, start_time: "09:00", end_time: "17:00" });
  };

  const removeOverride = (date: string) => {
    onChange(overrides.filter((o) => o.date !== date));
  };

  // Sort overrides by date
  const sorted = [...overrides].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarOff className="h-5 w-5" />
          Date Overrides
        </CardTitle>
        <CardDescription>
          Block specific dates or set custom hours for holidays and events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new override */}
        <div className="flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-muted/20">
          <div className="space-y-1">
            <Label className="text-xs">{t("date", "Date")}</Label>
            <Input
              type="date"
              value={newOverride.date}
              onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })}
              className="h-8 text-xs w-40"
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={newOverride.is_available}
              onCheckedChange={(checked) => setNewOverride({ ...newOverride, is_available: checked })}
            />
            <Label className="text-xs">
              {newOverride.is_available ? "Custom hours" : "Blocked"}
            </Label>
          </div>

          {newOverride.is_available && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">{t("start", "Start")}</Label>
                <Input
                  type="time"
                  value={newOverride.start_time}
                  onChange={(e) => setNewOverride({ ...newOverride, start_time: e.target.value })}
                  className="h-8 text-xs w-28"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("end", "End")}</Label>
                <Input
                  type="time"
                  value={newOverride.end_time}
                  onChange={(e) => setNewOverride({ ...newOverride, end_time: e.target.value })}
                  className="h-8 text-xs w-28"
                />
              </div>
            </>
          )}

          <Button size="sm" onClick={addOverride} disabled={!newOverride.date}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* List overrides */}
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No date overrides. Your weekly schedule applies to all dates.
          </p>
        ) : (
          <div className="space-y-2">
            {sorted.map((override) => (
              <div
                key={override.date}
                className="flex items-center justify-between py-2 px-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {format(new Date(override.date + "T00:00:00"), "EEE, MMM d, yyyy")}
                  </span>
                  {override.is_available ? (
                    <Badge variant="outline" className="text-xs">
                      {override.start_time} – {override.end_time}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">{t("blocked", "Blocked")}</Badge>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeOverride(override.date)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
