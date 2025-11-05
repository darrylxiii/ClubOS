import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MapPin, Globe, X } from 'lucide-react';
import { WorkAvailabilitySettings } from '@/components/settings/WorkAvailabilitySettings';
import { StealthModeToggle } from '@/components/StealthModeToggle';
import { TaskSchedulingPreferences } from '@/components/TaskSchedulingPreferences';

interface PreferencesTabProps {
  preferredWorkLocations: string[];
  remoteWorkPreference: boolean;
  selectedCity: string;
  cities: Array<{ id: string; name: string; country: string }>;
  workTimezone: string;
  workHoursStart: string;
  workHoursEnd: string;
  workDays: number[];
  workTimezoneFlexibilityHours: number;
  referenceTimezone: string | null;
  workWeekendAvailability: boolean;
  workOvertimeWillingness: number;
  stealthModeEnabled: boolean;
  stealthModeLevel: number;
  allowStealthColdOutreach: boolean;
  setSelectedCity: (city: string) => void;
  handleAddPreferredLocation: () => void;
  handleRemovePreferredLocation: (location: string) => void;
  handleRemoteToggle: () => void;
  setWorkTimezone: (timezone: string) => void;
  setWorkHoursStart: (time: string) => void;
  setWorkHoursEnd: (time: string) => void;
  setWorkDays: (days: number[]) => void;
  setWorkTimezoneFlexibilityHours: (hours: number) => void;
  setReferenceTimezone: (timezone: string | null) => void;
  setWorkWeekendAvailability: (available: boolean) => void;
  setWorkOvertimeWillingness: (level: number) => void;
  handleStealthModeChange: (enabled: boolean) => void;
  handleStealthLevelChange: (level: number) => void;
  handleColdOutreachChange: (allowed: boolean) => void;
}

export const PreferencesTab = ({
  preferredWorkLocations,
  remoteWorkPreference,
  selectedCity,
  cities,
  workTimezone,
  workHoursStart,
  workHoursEnd,
  workDays,
  workTimezoneFlexibilityHours,
  referenceTimezone,
  workWeekendAvailability,
  workOvertimeWillingness,
  stealthModeEnabled,
  stealthModeLevel,
  allowStealthColdOutreach,
  setSelectedCity,
  handleAddPreferredLocation,
  handleRemovePreferredLocation,
  handleRemoteToggle,
  setWorkTimezone,
  setWorkHoursStart,
  setWorkHoursEnd,
  setWorkDays,
  setWorkTimezoneFlexibilityHours,
  setReferenceTimezone,
  setWorkWeekendAvailability,
  setWorkOvertimeWillingness,
  handleStealthModeChange,
  handleStealthLevelChange,
  handleColdOutreachChange,
}: PreferencesTabProps) => {
  return (
    <div className="space-y-6">
      {/* Preferred Work Locations */}
      <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Preferred Work Locations
          </CardTitle>
          <CardDescription>
            Specify where you'd like to work - add multiple cities or toggle remote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Remote Toggle */}
          <div className="flex items-center justify-between p-4 border-2 border-accent/20 rounded-lg bg-accent/5">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-accent" />
              <div>
                <Label htmlFor="remoteWork" className="text-base font-semibold cursor-pointer">
                  Open to Remote Work
                </Label>
                <p className="text-sm text-muted-foreground">
                  Work from anywhere in the world
                </p>
              </div>
            </div>
            <Switch
              id="remoteWork"
              checked={remoteWorkPreference}
              onCheckedChange={handleRemoteToggle}
            />
          </div>

          {/* City Selection */}
          <div className="space-y-3">
            <Label>Add Preferred Cities</Label>
            <div className="flex gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {cities
                    .filter(city => !preferredWorkLocations.includes(`${city.name}, ${city.country}`))
                    .map((city) => (
                      <SelectItem key={city.id} value={`${city.name}, ${city.country}`}>
                        {city.name}, {city.country}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAddPreferredLocation}
                disabled={!selectedCity}
                className="bg-accent text-background hover:bg-accent/90"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Selected Locations */}
          {preferredWorkLocations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Locations:</p>
              <div className="flex flex-wrap gap-2">
                {preferredWorkLocations.map((location) => (
                  <div
                    key={location}
                    className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg group hover:bg-accent/20 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">{location}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePreferredLocation(location)}
                      className="text-accent hover:text-accent/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No preferred locations added yet. {remoteWorkPreference ? 'Remote work is enabled.' : 'Add cities or enable remote work.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Availability & Timezone Settings */}
      <WorkAvailabilitySettings
        workTimezone={workTimezone}
        workHoursStart={workHoursStart}
        workHoursEnd={workHoursEnd}
        workDays={workDays}
        timezoneFlexibilityHours={workTimezoneFlexibilityHours}
        referenceTimezone={referenceTimezone}
        weekendAvailability={workWeekendAvailability}
        overtimeWillingness={workOvertimeWillingness}
        onSettingsChange={(settings) => {
          setWorkTimezone(settings.work_timezone);
          setWorkHoursStart(settings.work_hours_start);
          setWorkHoursEnd(settings.work_hours_end);
          setWorkDays(settings.work_days);
          setWorkTimezoneFlexibilityHours(settings.work_timezone_flexibility_hours);
          setReferenceTimezone(settings.reference_timezone);
          setWorkWeekendAvailability(settings.weekend_availability);
          setWorkOvertimeWillingness(settings.overtime_willingness);
        }}
      />

      {/* Stealth Mode */}
      <StealthModeToggle
        stealthModeEnabled={stealthModeEnabled}
        stealthModeLevel={stealthModeLevel}
        allowStealthColdOutreach={allowStealthColdOutreach}
        onStealthModeChange={handleStealthModeChange}
        onStealthLevelChange={handleStealthLevelChange}
        onColdOutreachChange={handleColdOutreachChange}
      />

      {/* Task Scheduling */}
      <TaskSchedulingPreferences />
    </div>
  );
};
