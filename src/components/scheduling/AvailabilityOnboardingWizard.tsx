import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimezoneSelector } from "@/components/booking/TimezoneSelector";
import { Progress } from "@/components/ui/progress";
import { Clock, Calendar, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AvailabilityOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return { value: `${hour}:00`, label: `${hour}:00` };
});

export function AvailabilityOnboardingWizard({ onComplete, onSkip }: AvailabilityOnboardingWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam",
    availableDays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
    slotInterval: 30,
    minNoticeHours: 2,
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleDay = (day: number) => {
    const days = settings.availableDays.includes(day)
      ? settings.availableDays.filter((d) => d !== day)
      : [...settings.availableDays, day].sort();
    setSettings({ ...settings, availableDays: days });
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Save availability settings
      const { error: settingsError } = await supabase
        .from("booking_availability_settings")
        .upsert({
          user_id: user.id,
          default_timezone: settings.timezone,
          default_available_days: settings.availableDays,
          default_start_time: settings.startTime,
          default_end_time: settings.endTime,
          time_slot_interval: settings.slotInterval,
          default_min_notice_hours: settings.minNoticeHours,
        });

      if (settingsError) throw settingsError;

      // Mark onboarding as complete
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ availability_onboarding_completed: true })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast.success("Availability settings saved!");
      onComplete();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Calendar className="h-6 w-6 text-primary" />
          Set Up Your Availability
        </CardTitle>
        <CardDescription>
          Configure when you're available for bookings
        </CardDescription>
        <Progress value={progress} className="mt-4" />
        <p className="text-sm text-muted-foreground mt-2">
          Step {step} of {totalSteps}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium">Your Timezone</h3>
                <p className="text-sm text-muted-foreground">
                  All booking times will be shown in this timezone
                </p>
              </div>
              
              <div className="max-w-md mx-auto">
                <TimezoneSelector
                  value={settings.timezone}
                  onChange={(tz) => setSettings({ ...settings, timezone: tz })}
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium">Available Days</h3>
                <p className="text-sm text-muted-foreground">
                  Select which days you accept bookings
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all text-center
                      ${settings.availableDays.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                      }
                    `}
                  >
                    <span className="text-sm font-medium">{day.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium">Working Hours</h3>
                <p className="text-sm text-muted-foreground">
                  Set your default working hours
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Start Time
                  </Label>
                  <Select
                    value={settings.startTime}
                    onValueChange={(value) => setSettings({ ...settings, startTime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    End Time
                  </Label>
                  <Select
                    value={settings.endTime}
                    onValueChange={(value) => setSettings({ ...settings, endTime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <Label>Slot Duration</Label>
                <Select
                  value={settings.slotInterval.toString()}
                  onValueChange={(value) => setSettings({ ...settings, slotInterval: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between pt-6 border-t">
          <div>
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : onSkip ? (
              <Button variant="ghost" onClick={onSkip}>
                Skip for now
              </Button>
            ) : null}
          </div>
          
          <div>
            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving}>
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
