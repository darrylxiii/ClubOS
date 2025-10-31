import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { addWeeks, startOfWeek, endOfWeek } from "date-fns";

interface AvailabilityIndicatorProps {
  bookingLinkSlug: string;
  selectedDate?: Date;
}

interface WeekAvailability {
  week: number;
  count: number;
  label: string;
  color: string;
  icon: React.ReactNode;
}

export function AvailabilityIndicator({ bookingLinkSlug, selectedDate = new Date() }: AvailabilityIndicatorProps) {
  const [availability, setAvailability] = useState<WeekAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailability();
  }, [bookingLinkSlug, selectedDate]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const weeks = [
        { week: 0, start: startOfWeek(selectedDate), end: endOfWeek(selectedDate), label: "This week" },
        { week: 1, start: startOfWeek(addWeeks(selectedDate, 1)), end: endOfWeek(addWeeks(selectedDate, 1)), label: "Next week" },
        { week: 2, start: startOfWeek(addWeeks(selectedDate, 2)), end: endOfWeek(addWeeks(selectedDate, 2)), label: "In 2 weeks" },
      ];

      const weekAvailability: WeekAvailability[] = [];

      for (const { week, start, end, label } of weeks) {
        const { data, error } = await supabase.functions.invoke("get-available-slots", {
          body: {
            bookingLinkSlug,
            dateRange: {
              start: start.toISOString(),
              end: end.toISOString(),
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });

        if (error) {
          console.error("Error fetching availability:", error);
          continue;
        }

        const count = data?.slots?.length || 0;
        
        let color = "text-green-600";
        let icon = <Calendar className="h-4 w-4" />;
        
        if (count === 0) {
          color = "text-red-600";
          icon = <AlertTriangle className="h-4 w-4" />;
        } else if (count < 5) {
          color = "text-amber-600";
          icon = <TrendingUp className="h-4 w-4" />;
        }

        weekAvailability.push({
          week,
          count,
          label,
          color,
          icon,
        });
      }

      setAvailability(weekAvailability);
    } catch (error) {
      console.error("Error loading availability:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Alert className="mb-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Checking availability...</span>
        </div>
      </Alert>
    );
  }

  if (availability.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-4">
      <AlertDescription>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-sm font-medium">Availability:</span>
          <div className="flex flex-wrap gap-3">
            {availability.map(({ week, count, label, color, icon }) => (
              <div key={week} className={`flex items-center gap-1.5 ${color}`}>
                {icon}
                <span className="text-sm font-medium">
                  {count > 0 ? (
                    <>
                      {count} slot{count !== 1 ? 's' : ''} {label.toLowerCase()}
                    </>
                  ) : (
                    <>Fully booked {label.toLowerCase()}</>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
