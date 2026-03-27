import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Zap, Mail, MessageSquare, Globe, Clock } from "lucide-react";

interface Workflow {
  id: string;
  booking_link_id: string;
  workflow_type: string;
  trigger_event: string;
  trigger_minutes: number | null;
  email_template: string | null;
  sms_template: string | null;
  webhook_url: string | null;
  is_active: boolean;
}

interface BookingWorkflowBuilderProps {
  bookingLinks: { id: string; title: string }[];
  userId: string;
}

const TRIGGER_EVENTS = [
  { value: "booking_created", label: "When booking is created", icon: Zap },
  { value: "booking_cancelled", label: "When booking is cancelled", icon: Zap },
  { value: "booking_rescheduled", label: "When booking is rescheduled", icon: Zap },
  { value: "reminder_before", label: "Before meeting starts", icon: Clock },
  { value: "booking_completed", label: "After meeting ends", icon: Zap },
];

const WORKFLOW_TYPES = [
  { value: "email", label: "Send Email", icon: Mail },
  { value: "sms", label: "Send SMS", icon: MessageSquare },
  { value: "webhook", label: "Webhook (POST)", icon: Globe },
];

export function BookingWorkflowBuilder({ bookingLinks, userId }: BookingWorkflowBuilderProps) {
  const { t } = useTranslation('common');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    booking_link_id: bookingLinks[0]?.id || "",
    workflow_type: "email",
    trigger_event: "booking_created",
    trigger_minutes: 60,
    email_template: "",
    sms_template: "",
    webhook_url: "",
    is_active: true,
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_workflows")
      .select("*")
      .in("booking_link_id", bookingLinks.map((l) => l.id))
      .order("created_at", { ascending: false });

    if (!error) setWorkflows((data as unknown as Workflow[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newWorkflow.booking_link_id) {
      toast.error(t("select_a_booking_link", "Select a booking link"));
      return;
    }
    setCreating(true);

    const payload: Record<string, unknown> = {
      booking_link_id: newWorkflow.booking_link_id,
      workflow_type: newWorkflow.workflow_type,
      trigger_event: newWorkflow.trigger_event,
      is_active: newWorkflow.is_active,
    };

    if (newWorkflow.trigger_event === "reminder_before") {
      payload.trigger_minutes = newWorkflow.trigger_minutes;
    }
    if (newWorkflow.workflow_type === "email") payload.email_template = newWorkflow.email_template;
    if (newWorkflow.workflow_type === "sms") payload.sms_template = newWorkflow.sms_template;
    if (newWorkflow.workflow_type === "webhook") payload.webhook_url = newWorkflow.webhook_url;

    const { error } = await supabase.from("booking_workflows").insert(payload as any);

    if (error) {
      toast.error(t("failed_to_create_workflow", "Failed to create workflow"));
    } else {
      toast.success(t("workflow_created", "Workflow created"));
      loadWorkflows();
    }
    setCreating(false);
  };

  const toggleWorkflow = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("booking_workflows")
      .update({ is_active: !active } as any)
      .eq("id", id);

    if (!error) {
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_active: !active } : w))
      );
    }
  };

  const deleteWorkflow = async (id: string) => {
    const { error } = await supabase.from("booking_workflows").delete().eq("id", id);
    if (!error) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast.success(t("workflow_removed", "Workflow removed"));
    }
  };

  const getLinkTitle = (id: string) =>
    bookingLinks.find((l) => l.id === id)?.title || "Unknown";

  const getTriggerLabel = (event: string) =>
    TRIGGER_EVENTS.find((t) => t.value === event)?.label || event;

  const getTypeIcon = (type: string) => {
    const match = WORKFLOW_TYPES.find((t) => t.value === type);
    return match ? <match.icon className="h-4 w-4" /> : <Zap className="h-4 w-4" />;
  };

  if (bookingLinks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t("create_a_booking_link", "Create a booking link first to set up workflows.")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create new workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Workflow
          </CardTitle>
          <CardDescription>
            Automate actions when booking events occur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t("booking_link", "Booking Link")}</Label>
              <Select
                value={newWorkflow.booking_link_id}
                onValueChange={(v) => setNewWorkflow({ ...newWorkflow, booking_link_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bookingLinks.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("trigger", "Trigger")}</Label>
              <Select
                value={newWorkflow.trigger_event}
                onValueChange={(v) => setNewWorkflow({ ...newWorkflow, trigger_event: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {newWorkflow.trigger_event === "reminder_before" && (
            <div>
              <Label>{t("minutes_before", "Minutes Before")}</Label>
              <Select
                value={String(newWorkflow.trigger_minutes)}
                onValueChange={(v) => setNewWorkflow({ ...newWorkflow, trigger_minutes: parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">{t("15_minutes", "15 minutes")}</SelectItem>
                  <SelectItem value="30">{t("30_minutes", "30 minutes")}</SelectItem>
                  <SelectItem value="60">{t("1_hour", "1 hour")}</SelectItem>
                  <SelectItem value="120">{t("2_hours", "2 hours")}</SelectItem>
                  <SelectItem value="1440">{t("24_hours", "24 hours")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{t("action", "Action")}</Label>
            <Select
              value={newWorkflow.workflow_type}
              onValueChange={(v) => setNewWorkflow({ ...newWorkflow, workflow_type: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKFLOW_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newWorkflow.workflow_type === "email" && (
            <div>
              <Label>{t("email_template", "Email Template")}</Label>
              <Textarea
                value={newWorkflow.email_template}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, email_template: e.target.value })}
                placeholder="Hi {{guest_name}}, your meeting with {{host_name}} is coming up..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables: {"{{guest_name}}, {{host_name}}, {{date}}, {{time}}, {{duration}}, {{link}}"}
              </p>
            </div>
          )}

          {newWorkflow.workflow_type === "sms" && (
            <div>
              <Label>{t("sms_template", "SMS Template")}</Label>
              <Textarea
                value={newWorkflow.sms_template}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, sms_template: e.target.value })}
                placeholder="Reminder: Meeting with {{host_name}} at {{time}}"
                rows={2}
              />
            </div>
          )}

          {newWorkflow.workflow_type === "webhook" && (
            <div>
              <Label>{t("webhook_url", "Webhook URL")}</Label>
              <Input
                value={newWorkflow.webhook_url}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, webhook_url: e.target.value })}
                placeholder="https://hooks.example.com/booking"
              />
              <p className="text-xs text-muted-foreground mt-1">
                We will POST the booking payload to this URL.
              </p>
            </div>
          )}

          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? "Creating..." : "Create Workflow"}
          </Button>
        </CardContent>
      </Card>

      {/* Active workflows */}
      <Card>
        <CardHeader>
          <CardTitle>{t("active_workflows", "Active Workflows")}</CardTitle>
          <CardDescription>
            {workflows.length} workflow{workflows.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("loading", "Loading...")}</p>
          ) : workflows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No workflows yet. Create one above.
            </p>
          ) : (
            <div className="space-y-3">
              {workflows.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getTypeIcon(w.workflow_type)}
                    <div>
                      <p className="text-sm font-medium">
                        {getTriggerLabel(w.trigger_event)}
                        {w.trigger_minutes && w.trigger_event === "reminder_before"
                          ? ` (${w.trigger_minutes}m before)`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getLinkTitle(w.booking_link_id)} · {w.workflow_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={w.is_active ? "default" : "secondary"}>
                      {w.is_active ? "Active" : "Paused"}
                    </Badge>
                    <Switch
                      checked={w.is_active}
                      onCheckedChange={() => toggleWorkflow(w.id, w.is_active)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteWorkflow(w.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
