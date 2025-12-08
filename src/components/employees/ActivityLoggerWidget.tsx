import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLogDailyActivity } from "@/hooks/useActivityLogging";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Phone, 
  Mail, 
  Users, 
  Calendar, 
  Search, 
  MessageSquare,
  Save,
  Loader2
} from "lucide-react";

export function ActivityLoggerWidget() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [activity, setActivity] = useState({
    outreach_count: 0,
    calls_made: 0,
    emails_sent: 0,
    meetings_held: 0,
    candidates_sourced: 0,
    interviews_scheduled: 0,
    notes: '',
  });

  const logActivity = useLogDailyActivity();

  const handleSave = async () => {
    try {
      await logActivity.mutateAsync({ date, ...activity });
      toast.success('Activity logged successfully');
    } catch (error) {
      toast.error('Failed to log activity');
    }
  };

  const updateField = (field: keyof typeof activity, value: number | string) => {
    setActivity(prev => ({ ...prev, [field]: value }));
  };

  const activityFields = [
    { key: 'outreach_count', label: 'Outreach', icon: MessageSquare, color: 'text-blue-500' },
    { key: 'calls_made', label: 'Calls', icon: Phone, color: 'text-green-500' },
    { key: 'emails_sent', label: 'Emails', icon: Mail, color: 'text-purple-500' },
    { key: 'meetings_held', label: 'Meetings', icon: Calendar, color: 'text-amber-500' },
    { key: 'candidates_sourced', label: 'Sourced', icon: Search, color: 'text-cyan-500' },
    { key: 'interviews_scheduled', label: 'Interviews', icon: Users, color: 'text-rose-500' },
  ];

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Log Daily Activity</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {activityFields.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {label}
              </Label>
              <Input
                type="number"
                min={0}
                value={activity[key as keyof typeof activity] as number}
                onChange={(e) => updateField(key as keyof typeof activity, parseInt(e.target.value) || 0)}
                className="h-9"
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea
            value={activity.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Any additional notes about today's activities..."
            rows={2}
          />
        </div>

        <Button 
          onClick={handleSave} 
          className="w-full gap-2"
          disabled={logActivity.isPending}
        >
          {logActivity.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Activity
        </Button>
      </CardContent>
    </Card>
  );
}
