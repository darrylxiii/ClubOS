import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface CalendarConnection {
  id: string;
  provider: 'google' | 'microsoft';
  email: string;
  label: string;
  connectedAt: string;
}

export function CalendarConnectionStatus() {
  const [connectedCalendars, setConnectedCalendars] = useState<CalendarConnection[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadConnectedCalendars();
  }, []);

  const loadConnectedCalendars = () => {
    const savedCalendars = localStorage.getItem('connected_calendars');
    if (savedCalendars) {
      try {
        const calendars = JSON.parse(savedCalendars) as CalendarConnection[];
        setConnectedCalendars(calendars);
        setLastSync(new Date());
      } catch (error) {
        console.error('Error parsing saved calendars:', error);
      }
    }
  };

  const handleRefresh = () => {
    loadConnectedCalendars();
    setLastSync(new Date());
  };

  if (connectedCalendars.length === 0) {
    return (
      <Alert variant="default" className="border-amber-500/20 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          No Calendar Connected
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <div className="space-y-2">
            <p className="text-sm">
              Bookings won't check for conflicts with your calendar. Connect Google or Microsoft Calendar to prevent double-bookings.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/settings')}
              className="mt-2"
            >
              <Calendar className="h-3 w-3 mr-2" />
              Connect Calendar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500/20 bg-green-500/10">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-900 dark:text-green-100 flex items-center justify-between">
        <span>Calendar Connected</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </AlertTitle>
      <AlertDescription className="text-green-800 dark:text-green-200">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 mt-2">
            {connectedCalendars.map((cal) => (
              <Badge key={cal.id} variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {cal.provider === 'google' ? 'Google' : 'Microsoft'} - {cal.label}
              </Badge>
            ))}
          </div>
          {lastSync && (
            <p className="text-xs text-muted-foreground mt-2">
              Last synced: {lastSync.toLocaleTimeString()}
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
