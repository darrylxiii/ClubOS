import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  const [commonTimezones] = useState([
    { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
    { value: "Europe/London", label: "London (GMT)" },
    { value: "America/New_York", label: "New York (EST)" },
    { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
    { value: "America/Chicago", label: "Chicago (CST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Australia/Sydney", label: "Sydney (AEDT)" },
  ]);

  const [detectedTimezone, setDetectedTimezone] = useState<string>("");

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDetectedTimezone(tz);
    
    // Auto-set if not already set
    if (!value && tz) {
      onChange(tz);
    }
  }, []);

  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-lg">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Timezone:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-auto border-none bg-transparent h-auto p-0 text-sm font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {detectedTimezone && !commonTimezones.find(tz => tz.value === detectedTimezone) && (
            <>
              <SelectItem value={detectedTimezone}>
                {detectedTimezone} (Auto-detected)
              </SelectItem>
              <div className="h-px bg-border my-2" />
            </>
          )}
          {commonTimezones.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
