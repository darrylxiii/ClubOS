import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Calendar, RefreshCw, Link as LinkIcon, Unlink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function NotetakerSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(true);
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(true);
  const [taskCreationEnabled, setTaskCreationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [calendarConnections, setCalendarConnections] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
    if (user) {
      loadCalendarConnections();
    }
  }, [user]);

  const loadSettings = () => {
    const settings = localStorage.getItem('club-ai-settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setAutoJoinEnabled(parsed.autoJoinEnabled ?? true);
      setAutoAnalysisEnabled(parsed.autoAnalysisEnabled ?? true);
      setTaskCreationEnabled(parsed.taskCreationEnabled ?? false);
      setNotificationsEnabled(parsed.notificationsEnabled ?? true);
    }
  };

  const saveSettings = () => {
    const settings = {
      autoJoinEnabled,
      autoAnalysisEnabled,
      taskCreationEnabled,
      notificationsEnabled,
    };
    localStorage.setItem('club-ai-settings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your Club AI Notetaker preferences have been updated.",
    });
  };

  const loadCalendarConnections = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    setCalendarConnections(data || []);
  };

  const handleDisconnect = async (connectionId: string) => {
    const { error } = await supabase
      .from('calendar_connections')
      .update({ is_active: false })
      .eq('id', connectionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect calendar",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Calendar disconnected",
        description: "Your calendar has been disconnected successfully.",
      });
      loadCalendarConnections();
    }
  };

  useEffect(() => {
    saveSettings();
  }, [autoJoinEnabled, autoAnalysisEnabled, taskCreationEnabled, notificationsEnabled]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Club AI Notetaker</h3>
            <p className="text-sm text-muted-foreground">
              Configure how Club AI joins and analyzes your meetings
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-join">Auto-join meetings</Label>
              <p className="text-sm text-muted-foreground">
                Bot automatically joins when you enable it for a meeting
              </p>
            </div>
            <Switch
              id="auto-join"
              checked={autoJoinEnabled}
              onCheckedChange={setAutoJoinEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-analysis">Automatic analysis</Label>
              <p className="text-sm text-muted-foreground">
                Generate insights and summaries after meeting ends
              </p>
            </div>
            <Switch
              id="auto-analysis"
              checked={autoAnalysisEnabled}
              onCheckedChange={setAutoAnalysisEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="task-creation">Create tasks from actions</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create tasks from identified action items
              </p>
            </div>
            <Switch
              id="task-creation"
              checked={taskCreationEnabled}
              onCheckedChange={setTaskCreationEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Meeting notifications</Label>
              <p className="text-sm text-muted-foreground">
                Notify when analysis is ready and action items are created
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Connected Calendars</h3>
            <p className="text-sm text-muted-foreground">
              Manage your calendar integrations
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {calendarConnections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No calendars connected</p>
            </div>
          ) : (
            calendarConnections.map(connection => (
              <Card key={connection.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold">
                        {connection.provider === 'google' ? 'Google' : 'Microsoft'} - {connection.calendar_label}
                      </h4>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        Active
                      </Badge>
                    </div>
                    {connection.last_synced_at && (
                      <p className="text-sm text-muted-foreground">
                        Last synced: {format(new Date(connection.last_synced_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(connection.id)}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1">
              + Connect Google Calendar
            </Button>
            <Button variant="outline" className="flex-1">
              + Connect Microsoft Calendar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
