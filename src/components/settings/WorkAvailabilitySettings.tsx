import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Clock, Zap, Calendar } from "lucide-react";
import { parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

interface WorkAvailabilitySettingsProps {
  workTimezone: string;
  workHoursStart: string;
  workHoursEnd: string;
  workDays: number[];
  timezoneFlexibilityHours: number;
  referenceTimezone: string | null;
  weekendAvailability: boolean;
  overtimeWillingness: number;
  onSettingsChange: (settings: {
    work_timezone: string;
    work_hours_start: string;
    work_hours_end: string;
    work_days: number[];
    work_timezone_flexibility_hours: number;
    reference_timezone: string | null;
    weekend_availability: boolean;
    overtime_willingness: number;
  }) => void;
}

const COMMON_TIMEZONES = [
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)", region: "Europe" },
  { value: "Europe/London", label: "London (GMT/BST)", region: "Europe" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)", region: "Europe" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)", region: "Europe" },
  { value: "America/New_York", label: "New York (EST/EDT)", region: "Americas" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)", region: "Americas" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)", region: "Americas" },
  { value: "America/Toronto", label: "Toronto (EST/EDT)", region: "Americas" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)", region: "Americas" },
  { value: "Asia/Dubai", label: "Dubai (GST)", region: "Asia" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", region: "Asia" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", region: "Asia" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)", region: "Asia" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", region: "Asia" },
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)", region: "Oceania" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT/NZST)", region: "Oceania" },
];

const WEEKDAYS = [
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
  { value: 7, label: "Sun", full: "Sunday" },
];

export function WorkAvailabilitySettings({
  workTimezone,
  workHoursStart,
  workHoursEnd,
  workDays,
  timezoneFlexibilityHours,
  referenceTimezone,
  weekendAvailability,
  overtimeWillingness,
  onSettingsChange,
}: WorkAvailabilitySettingsProps) {
  const [localTimezone, setLocalTimezone] = useState(workTimezone);
  const [localStartHour, setLocalStartHour] = useState(9);
  const [localEndHour, setLocalEndHour] = useState(17);
  const [localWorkDays, setLocalWorkDays] = useState<number[]>(workDays);
  const [localFlexibility, setLocalFlexibility] = useState(timezoneFlexibilityHours);
  const [localReference, setLocalReference] = useState<string | null>(referenceTimezone);
  const [localWeekend, setLocalWeekend] = useState(weekendAvailability);
  const [localOvertime, setLocalOvertime] = useState(overtimeWillingness);
  const [currentTime, setCurrentTime] = useState("");

  // Parse hours from time string on mount
  useEffect(() => {
    if (workHoursStart) {
      const startParsed = parse(workHoursStart, "HH:mm:ss", new Date());
      setLocalStartHour(startParsed.getHours());
    }
    if (workHoursEnd) {
      const endParsed = parse(workHoursEnd, "HH:mm:ss", new Date());
      setLocalEndHour(endParsed.getHours());
    }
  }, [workHoursStart, workHoursEnd]);

  // Update current time display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = formatInTimeZone(now, localTimezone, "h:mm a");
      setCurrentTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [localTimezone]);

  // Emit changes to parent
  const emitChanges = () => {
    onSettingsChange({
      work_timezone: localTimezone,
      work_hours_start: `${String(localStartHour).padStart(2, "0")}:00:00`,
      work_hours_end: `${String(localEndHour).padStart(2, "0")}:00:00`,
      work_days: localWorkDays,
      work_timezone_flexibility_hours: localFlexibility,
      reference_timezone: localReference,
      weekend_availability: localWeekend,
      overtime_willingness: localOvertime,
    });
  };

  const handleTimezoneChange = (tz: string) => {
    setLocalTimezone(tz);
    emitChanges();
  };

  const handleHoursChange = (values: number[]) => {
    setLocalStartHour(values[0]);
    setLocalEndHour(values[1]);
    emitChanges();
  };

  const handleFlexibilityChange = (values: number[]) => {
    setLocalFlexibility(values[0]);
    emitChanges();
  };

  const handleOvertimeChange = (values: number[]) => {
    setLocalOvertime(values[0]);
    emitChanges();
  };

  const toggleWorkDay = (day: number) => {
    const newDays = localWorkDays.includes(day)
      ? localWorkDays.filter((d) => d !== day)
      : [...localWorkDays, day].sort();
    setLocalWorkDays(newDays);
    emitChanges();
  };

  const handleWeekendToggle = (checked: boolean) => {
    setLocalWeekend(checked);
    emitChanges();
  };

  const handleReferenceChange = (ref: string | null) => {
    setLocalReference(ref);
    emitChanges();
  };

  // Calculate preview hours in reference timezone
  const getPreviewInReferenceTimezone = () => {
    if (!localReference) return null;

    try {
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(localStartHour, 0, 0, 0);
      const endTime = new Date(now);
      endTime.setHours(localEndHour, 0, 0, 0);

      const refStartTime = formatInTimeZone(startTime, localReference, "h:mm a");
      const refEndTime = formatInTimeZone(endTime, localReference, "h:mm a");

      // Calculate flexibility range
      const flexStartEarly = new Date(startTime);
      flexStartEarly.setHours(startTime.getHours() - localFlexibility);
      const flexStartLate = new Date(startTime);
      flexStartLate.setHours(startTime.getHours() + localFlexibility);
      const flexEndEarly = new Date(endTime);
      flexEndEarly.setHours(endTime.getHours() - localFlexibility);
      const flexEndLate = new Date(endTime);
      flexEndLate.setHours(endTime.getHours() + localFlexibility);

      return {
        start: refStartTime,
        end: refEndTime,
        flexStart: `${formatInTimeZone(flexStartEarly, localReference, "h:mm a")} - ${formatInTimeZone(flexStartLate, localReference, "h:mm a")}`,
        flexEnd: `${formatInTimeZone(flexEndEarly, localReference, "h:mm a")} - ${formatInTimeZone(flexEndLate, localReference, "h:mm a")}`,
      };
    } catch (_error) {
      console.error("Error calculating preview:", _error);
      return null;
    }
  };

  const previewData = getPreviewInReferenceTimezone();

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const getOvertimeLabel = (value: number) => {
    if (value <= 2) return "Strict hours";
    if (value <= 4) return "Somewhat flexible";
    if (value <= 6) return "Moderate";
    if (value <= 8) return "Quite flexible";
    return "Very flexible";
  };

  return (
    <Card id="work-availability" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-accent" />
          Work Availability & Timezone Preferences
        </CardTitle>
        <CardDescription>
          Set your working hours and timezone flexibility for company matching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Your Timezone */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Your Timezone</Label>
            <Badge variant="outline" className="gap-1.5">
              <Clock className="w-3 h-3" />
              {currentTime}
            </Badge>
          </div>
          <Select value={localTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Europe", "Americas", "Asia", "Oceania"].map((region) => (
                <div key={region}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {region}
                  </div>
                  {COMMON_TIMEZONES.filter((tz) => tz.region === region).map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This is automatically detected but you can change it if needed
          </p>
        </div>

        {/* Working Hours */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Your Working Hours (in your timezone)</Label>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-primary">{formatHour(localStartHour)}</span>
              <span className="text-muted-foreground">to</span>
              <span className="font-medium text-primary">{formatHour(localEndHour)}</span>
            </div>
            <Slider
              value={[localStartHour, localEndHour]}
              onValueChange={handleHoursChange}
              min={0}
              max={23}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>
        </div>

        {/* Reference Timezone & Flexibility */}
        <div className="space-y-4 p-4 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-start gap-2">
            <Zap className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-base font-medium">Timezone Flexibility</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Specify if you want to work for companies in a different timezone
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">I want to work for companies primarily in:</Label>
                <Select
                  value={localReference || "none"}
                  onValueChange={(val) => handleReferenceChange(val === "none" ? null : val)}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Same as my timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Same as my timezone (no flexibility needed)</SelectItem>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {localReference && (
                <>
                  <div className="space-y-3">
                    <Label className="text-sm">I'm willing to shift my hours:</Label>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="text-muted-foreground">0 hours</span>
                      <Badge variant="secondary">±{localFlexibility} hours</Badge>
                      <span className="text-muted-foreground">±12 hours</span>
                    </div>
                    <Slider
                      value={[localFlexibility]}
                      onValueChange={handleFlexibilityChange}
                      min={0}
                      max={12}
                      step={1}
                      className="py-4"
                    />
                  </div>

                  {previewData && (
                    <div className="mt-4 p-3 bg-background/50 rounded-md space-y-2">
                      <p className="text-xs font-semibold text-accent">
                        Preview for {COMMON_TIMEZONES.find((tz) => tz.value === localReference)?.label}:
                      </p>
                      <div className="text-sm space-y-1">
                        <p>
                          • Your {formatHour(localStartHour)} - {formatHour(localEndHour)} = {previewData.start} - {previewData.end}
                        </p>
                        {localFlexibility > 0 && (
                          <>
                            <p className="text-muted-foreground text-xs">
                              With ±{localFlexibility}h flexibility:
                            </p>
                            <p className="text-xs">
                              • You can start between: {previewData.flexStart}
                            </p>
                            <p className="text-xs">
                              • You can end between: {previewData.flexEnd}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Working Days */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Working Days</Label>
            <Badge variant="outline">{localWorkDays.length} days/week</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWorkDay(day.value)}
                className={`flex-1 min-w-[60px] px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  localWorkDays.includes(day.value)
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                title={day.full}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekend Availability */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label htmlFor="weekend-availability" className="text-base font-medium cursor-pointer">
              Weekend Availability
            </Label>
            <p className="text-sm text-muted-foreground">
              I'm available to work on weekends if needed
            </p>
          </div>
          <Switch
            id="weekend-availability"
            checked={localWeekend}
            onCheckedChange={handleWeekendToggle}
          />
        </div>

        {/* Overtime Willingness */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Flexibility for Overtime</Label>
            <Badge variant="outline">{getOvertimeLabel(localOvertime)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            How willing are you to work beyond your stated hours occasionally?
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Strict hours</span>
              <span className="text-muted-foreground">Very flexible</span>
            </div>
            <Slider
              value={[localOvertime]}
              onValueChange={handleOvertimeChange}
              min={0}
              max={10}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {[0, 2, 4, 6, 8, 10].map((val) => (
                <span key={val}>{val}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Info */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-primary mb-2">Your Work Schedule Summary</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  • Works {formatHour(localStartHour)} - {formatHour(localEndHour)} in {COMMON_TIMEZONES.find((tz) => tz.value === localTimezone)?.label}
                </li>
                <li>
                  • Available {localWorkDays.length} days per week ({localWeekend ? "including weekends" : "weekdays only"})
                </li>
                {localReference && (
                  <li>
                    • Willing to adjust ±{localFlexibility} hours for {COMMON_TIMEZONES.find((tz) => tz.value === localReference)?.label} companies
                  </li>
                )}
                <li>
                  • Overtime flexibility: {getOvertimeLabel(localOvertime)}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
