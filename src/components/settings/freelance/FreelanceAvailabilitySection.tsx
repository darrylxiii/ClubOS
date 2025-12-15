import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FreelanceAvailabilitySectionProps {
  userId: string;
  freelanceProfile: any;
  onUpdate: () => void;
}

export function FreelanceAvailabilitySection({ userId, freelanceProfile, onUpdate }: FreelanceAvailabilitySectionProps) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>(freelanceProfile?.freelance_status || 'available');
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(freelanceProfile?.availability_hours_per_week || 20);
  const [maxConcurrentProjects, setMaxConcurrentProjects] = useState<number>(freelanceProfile?.max_concurrent_projects || 2);
  const [availableFromDate, setAvailableFromDate] = useState<string>(freelanceProfile?.available_from_date || '');
  const [isAcceptingInvites, setIsAcceptingInvites] = useState<boolean>(freelanceProfile?.is_accepting_invites ?? true);
  const [isOpenToRetainers, setIsOpenToRetainers] = useState<boolean>(freelanceProfile?.is_open_to_retainers ?? true);
  const [autoRespondMessage, setAutoRespondMessage] = useState<string>(freelanceProfile?.auto_respond_message || '');
  const [timezone, setTimezone] = useState<string>(freelanceProfile?.timezone_preference || Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    if (freelanceProfile) {
      setStatus(freelanceProfile.freelance_status || 'available');
      setHoursPerWeek(freelanceProfile.availability_hours_per_week || 20);
      setMaxConcurrentProjects(freelanceProfile.max_concurrent_projects || 2);
      setAvailableFromDate(freelanceProfile.available_from_date || '');
      setIsAcceptingInvites(freelanceProfile.is_accepting_invites ?? true);
      setIsOpenToRetainers(freelanceProfile.is_open_to_retainers ?? true);
      setAutoRespondMessage(freelanceProfile.auto_respond_message || '');
      setTimezone(freelanceProfile.timezone_preference || Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [freelanceProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          freelance_status: status,
          availability_hours_per_week: hoursPerWeek,
          max_concurrent_projects: maxConcurrentProjects,
          available_from_date: availableFromDate || null,
          is_accepting_invites: isAcceptingInvites,
          is_open_to_retainers: isOpenToRetainers,
          auto_respond_message: autoRespondMessage || null,
          timezone_preference: timezone,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      toast.success("Availability settings saved");
      onUpdate();
    } catch (error: any) {
      console.error("Error saving availability:", error);
      toast.error("Failed to save availability settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Availability & Capacity
        </CardTitle>
        <CardDescription>
          Control when and how much you can work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="space-y-3">
          <Label>Current Status</Label>
          <div className="flex gap-2">
            {['available', 'busy', 'not_accepting'].map((s) => (
              <Button
                key={s}
                variant={status === s ? 'default' : 'outline'}
                onClick={() => setStatus(s)}
                size="sm"
                className="capitalize"
              >
                {s.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Hours Per Week */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Hours Per Week</Label>
            <span className="text-sm font-medium">{hoursPerWeek} hours</span>
          </div>
          <Slider
            value={[hoursPerWeek]}
            onValueChange={(v) => setHoursPerWeek(v[0])}
            min={5}
            max={60}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            How many hours per week can you dedicate to freelance work?
          </p>
        </div>

        {/* Max Concurrent Projects */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Max Concurrent Projects
            </Label>
            <span className="text-sm font-medium">{maxConcurrentProjects}</span>
          </div>
          <Slider
            value={[maxConcurrentProjects]}
            onValueChange={(v) => setMaxConcurrentProjects(v[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
        </div>

        {/* Available From Date */}
        <div className="space-y-2">
          <Label htmlFor="available-from">Available From</Label>
          <Input
            id="available-from"
            type="date"
            value={availableFromDate}
            onChange={(e) => setAvailableFromDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty if immediately available
          </p>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timezone
          </Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe/Amsterdam">Europe/Amsterdam (CET)</SelectItem>
              <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
              <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
              <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
              <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Accept Direct Invites</Label>
              <p className="text-xs text-muted-foreground">
                Allow clients to invite you directly to projects
              </p>
            </div>
            <Switch
              checked={isAcceptingInvites}
              onCheckedChange={setIsAcceptingInvites}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Open to Retainers</Label>
              <p className="text-xs text-muted-foreground">
                Show interest in ongoing retainer arrangements
              </p>
            </div>
            <Switch
              checked={isOpenToRetainers}
              onCheckedChange={setIsOpenToRetainers}
            />
          </div>
        </div>

        {/* Auto-respond Message */}
        {status === 'busy' && (
          <div className="space-y-2">
            <Label htmlFor="auto-respond">Auto-Respond Message (when busy)</Label>
            <Input
              id="auto-respond"
              placeholder="Thanks for reaching out! I'm currently at capacity but will be available soon..."
              value={autoRespondMessage}
              onChange={(e) => setAutoRespondMessage(e.target.value)}
            />
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Availability"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
