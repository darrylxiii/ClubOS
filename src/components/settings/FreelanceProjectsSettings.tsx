import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Rocket, ExternalLink, Briefcase, Clock, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "Development", "Design", "Marketing", "Strategy", "Writing",
  "Data Science", "Product Management", "Sales", "Operations", "Finance"
];

const ENGAGEMENT_TYPES = [
  { value: "one-time", label: "One-time Project" },
  { value: "recurring", label: "Recurring Work" },
  { value: "retainer", label: "Retainer" }
];

const PROJECT_DURATIONS = [
  { value: "short", label: "Short (<1 month)" },
  { value: "medium", label: "Medium (1-3 months)" },
  { value: "long", label: "Long (3+ months)" }
];

interface FreelanceProjectsSettingsProps {
  userId: string;
  profile: any;
  onSave: () => Promise<void>;
}

export function FreelanceProjectsSettings({ userId, profile, onSave }: FreelanceProjectsSettingsProps) {
  const navigate = useNavigate();
  const [openToFreelance, setOpenToFreelance] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'not_accepting'>('not_accepting');
  const [categories, setCategories] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [yearsExperience, setYearsExperience] = useState<number | null>(null);
  const [engagementTypes, setEngagementTypes] = useState<string[]>(['one-time', 'recurring']);
  const [projectDurations, setProjectDurations] = useState<string[]>(['short', 'medium']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setOpenToFreelance(profile.open_to_freelance_work || false);
      setAvailabilityStatus(profile.freelance_availability_status || 'not_accepting');
      setCategories(profile.freelance_categories || []);
      setPortfolioUrl(profile.portfolio_url || "");
      setYearsExperience(profile.freelance_years_experience);
      setEngagementTypes(profile.freelance_preferred_engagement_types || ['one-time', 'recurring']);
      setProjectDurations(profile.freelance_preferred_project_duration || ['short', 'medium']);
    }
  }, [profile]);

  const toggleCategory = (category: string) => {
    setCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleEngagementType = (type: string) => {
    setEngagementTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleProjectDuration = (duration: string) => {
    setProjectDurations(prev =>
      prev.includes(duration)
        ? prev.filter(d => d !== duration)
        : [...prev, duration]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profiles table first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          open_to_freelance_work: openToFreelance,
          freelance_availability_status: openToFreelance ? availabilityStatus : 'not_accepting',
          freelance_categories: categories,
          portfolio_url: portfolioUrl,
          freelance_years_experience: yearsExperience,
          freelance_preferred_engagement_types: engagementTypes,
          freelance_preferred_project_duration: projectDurations,
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profiles:', profileError);
        throw profileError;
      }

      // Check if freelance_profiles record exists (uses profile id as primary key)
      const { data: existingFreelanceProfile } = await supabase
        .from('freelance_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      // Update or create freelance_profiles record
      if (existingFreelanceProfile) {
        const { error: freelanceError } = await supabase
          .from('freelance_profiles')
          .update({
            freelance_status: openToFreelance ? availabilityStatus : 'not_accepting',
            categories: categories,
            preferred_engagement_types: engagementTypes,
            preferred_project_duration: projectDurations,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (freelanceError) {
          console.error('Error updating freelance_profiles:', freelanceError);
          // Don't throw - profiles was updated successfully
        }
      } else if (openToFreelance) {
        // Create new freelance_profiles record if enabling freelance
        // id references profiles.id, so we use userId as the id
        const { error: createError } = await supabase
          .from('freelance_profiles')
          .insert({
            id: userId,
            freelance_status: availabilityStatus,
            categories: categories,
            preferred_engagement_types: engagementTypes,
            preferred_project_duration: projectDurations,
          });

        if (createError) {
          console.error('Error creating freelance_profiles:', createError);
          // Don't throw - profiles was updated successfully
        }
      }

      toast.success('Freelance settings saved successfully');
      await onSave();
    } catch (error) {
      console.error('Error saving freelance settings:', error);
      toast.error('Failed to save freelance settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Availability Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Freelance Availability
          </CardTitle>
          <CardDescription>
            Enable freelance mode to start receiving AI-matched project opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="open-to-freelance">Open to Freelance Projects</Label>
              <p className="text-sm text-muted-foreground">
                Show your profile to clients looking for freelancers
              </p>
            </div>
            <Switch
              id="open-to-freelance"
              checked={openToFreelance}
              onCheckedChange={setOpenToFreelance}
            />
          </div>

          {openToFreelance && (
            <div className="space-y-3 pt-4 border-t">
              <Label>Current Status</Label>
              <div className="flex gap-2">
                <Button
                  variant={availabilityStatus === 'available' ? 'default' : 'outline'}
                  onClick={() => setAvailabilityStatus('available')}
                  size="sm"
                >
                  Available
                </Button>
                <Button
                  variant={availabilityStatus === 'busy' ? 'default' : 'outline'}
                  onClick={() => setAvailabilityStatus('busy')}
                  size="sm"
                >
                  Busy
                </Button>
                <Button
                  variant={availabilityStatus === 'not_accepting' ? 'default' : 'outline'}
                  onClick={() => setAvailabilityStatus('not_accepting')}
                  size="sm"
                >
                  Not Accepting
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {openToFreelance && (
        <>
          {/* Rates Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Rates & Availability</CardTitle>
              <CardDescription>
                Your rates are managed in the Compensation tab
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Hourly Rate</p>
                  <p className="text-2xl font-bold">
                    €{profile?.freelance_hourly_rate_min || 0} - €{profile?.freelance_hourly_rate_max || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Available {profile?.freelance_hours_per_week_min || 0}-{profile?.freelance_hours_per_week_max || 0} hours/week
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/settings?tab=compensation')}
                  size="sm"
                  className="gap-2"
                >
                  Update Rates <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Freelance Categories
              </CardTitle>
              <CardDescription>
                Select the types of projects you're interested in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Badge
                    key={category}
                    variant={categories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Portfolio & Experience
              </CardTitle>
              <CardDescription>
                Showcase your work and experience to potential clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="portfolio-url">Portfolio URL</Label>
                <Input
                  id="portfolio-url"
                  placeholder="https://github.com/yourusername or https://yourportfolio.com"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="years-experience">Years of Freelancing Experience</Label>
                <Input
                  id="years-experience"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="0"
                  value={yearsExperience || ""}
                  onChange={(e) => setYearsExperience(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Project Preferences
              </CardTitle>
              <CardDescription>
                Help us match you with the right projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Preferred Engagement Types</Label>
                <div className="flex flex-wrap gap-2">
                  {ENGAGEMENT_TYPES.map((type) => (
                    <Badge
                      key={type.value}
                      variant={engagementTypes.includes(type.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleEngagementType(type.value)}
                    >
                      {type.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Preferred Project Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_DURATIONS.map((duration) => (
                    <Badge
                      key={duration.value}
                      variant={projectDurations.includes(duration.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleProjectDuration(duration.value)}
                    >
                      {duration.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => navigate('/projects')}
              size="lg"
            >
              View Projects
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
