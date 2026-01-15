import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Send,
  UserCheck,
  Bell,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface AutonomySetting {
  id: string;
  action_type: string;
  autonomy_level: string;
  notification_preference: string;
  conditions: Record<string, unknown>;
}

const actionTypeConfig: Record<string, { 
  icon: typeof Shield; 
  label: string; 
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}> = {
  send_follow_up: { 
    icon: MessageSquare, 
    label: 'Send Follow-up Messages',
    description: 'Automatically send follow-up emails to candidates who haven\'t responded',
    riskLevel: 'low'
  },
  schedule_interview: { 
    icon: Calendar, 
    label: 'Schedule Interviews',
    description: 'Book interviews in available calendar slots',
    riskLevel: 'low'
  },
  create_task: { 
    icon: FileText, 
    label: 'Create Tasks',
    description: 'Automatically create tasks based on workflow triggers',
    riskLevel: 'low'
  },
  submit_to_client: { 
    icon: Send, 
    label: 'Submit to Client',
    description: 'Submit candidate profiles to hiring companies',
    riskLevel: 'medium'
  },
  update_application_status: { 
    icon: UserCheck, 
    label: 'Update Application Status',
    description: 'Move candidates through pipeline stages',
    riskLevel: 'medium'
  },
  make_offer: { 
    icon: Zap, 
    label: 'Make Offer',
    description: 'Send offer letters to candidates',
    riskLevel: 'high'
  },
};

const autonomyLevels = [
  { value: 'autonomous', label: 'Fully Autonomous', description: 'QUIN acts without asking' },
  { value: 'suggest', label: 'Suggest First', description: 'QUIN suggests, you confirm' },
  { value: 'ask', label: 'Always Ask', description: 'QUIN always asks before acting' },
  { value: 'disabled', label: 'Disabled', description: 'QUIN will not perform this action' },
];

const notificationPreferences = [
  { value: 'none', label: 'No notifications' },
  { value: 'immediate', label: 'Immediate' },
  { value: 'summary', label: 'Daily summary' },
];

export function AutonomySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['autonomy-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('agent_autonomy_settings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as AutonomySetting[];
    },
    enabled: !!user?.id,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ 
      actionType, 
      updates 
    }: { 
      actionType: string; 
      updates: Partial<AutonomySetting> 
    }) => {
      const existing = settings?.find(s => s.action_type === actionType);

      if (existing) {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.autonomy_level) updateData.autonomy_level = updates.autonomy_level;
        if (updates.notification_preference) updateData.notification_preference = updates.notification_preference;
        
        const { error } = await supabase
          .from('agent_autonomy_settings')
          .update(updateData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agent_autonomy_settings')
          .insert({
            user_id: user?.id,
            action_type: actionType,
            autonomy_level: updates.autonomy_level || 'suggest',
            notification_preference: updates.notification_preference || 'summary',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autonomy-settings'] });
      toast.success("Settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    }
  });

  const getSettingValue = (actionType: string, field: keyof AutonomySetting): string => {
    const setting = settings?.find(s => s.action_type === actionType);
    if (!setting) {
      // Return defaults
      if (field === 'autonomy_level') return 'suggest';
      if (field === 'notification_preference') return 'summary';
    }
    return String(setting?.[field] || '');
  };

  const getRiskBadge = (riskLevel: 'low' | 'medium' | 'high') => {
    const config = {
      low: { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Low Risk' },
      medium: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Medium Risk' },
      high: { color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', label: 'High Risk' },
    };
    return (
      <Badge variant="outline" className={config[riskLevel].color}>
        {config[riskLevel].label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Autonomy Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Agent Autonomy Settings
        </CardTitle>
        <CardDescription>
          Control how much independence QUIN has for different actions. 
          Higher autonomy means faster execution; lower means more control.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(actionTypeConfig).map(([actionType, config]) => {
            const Icon = config.icon;
            const currentLevel = getSettingValue(actionType, 'autonomy_level');
            const currentNotification = getSettingValue(actionType, 'notification_preference');

            return (
              <div 
                key={actionType} 
                className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{config.label}</h4>
                        {getRiskBadge(config.riskLevel)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Autonomy Level</Label>
                    <Select
                      value={currentLevel}
                      onValueChange={(value) => 
                        updateSettingMutation.mutate({ 
                          actionType, 
                          updates: { autonomy_level: value } 
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {autonomyLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex flex-col">
                              <span>{level.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {level.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Bell className="h-3 w-3" />
                      Notifications
                    </Label>
                    <Select
                      value={currentNotification}
                      onValueChange={(value) => 
                        updateSettingMutation.mutate({ 
                          actionType, 
                          updates: { notification_preference: value } 
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationPreferences.map((pref) => (
                          <SelectItem key={pref.value} value={pref.value}>
                            {pref.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
