import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Briefcase, Target, DollarSign, MapPin, Upload, X, Loader2, CheckCircle } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

const STEPS = ["professional", "career", "preferences"];

export default function OAuthOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cities, setCities] = useState<Array<{ id: string; name: string; country: string }>>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [cityRadius, setCityRadius] = useState(25);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    // Professional
    current_title: "",
    linkedin_url: "",
    bio: "",
    resume_url: "",
    resume_filename: "",
    // Career
    dream_job_title: "",
    employment_type: "fulltime" as "fulltime" | "freelance" | "both",
    notice_period: "2_weeks",
    remote_work_aspiration: false,
    // Compensation
    current_salary_min: 50000,
    current_salary_max: 70000,
    salary_preference_hidden: false,
    desired_salary_min: 70000,
    desired_salary_max: 90000,
    freelance_hourly_rate_min: 50,
    freelance_hourly_rate_max: 100,
    // Preferences
    remote_work_preference: false,
    preferred_work_locations: [] as Array<{ city: string; country: string; radius_km: number }>,
  });

  useEffect(() => {
    loadCities();
    loadExistingProfile();
  }, []);

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, country')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (data) setCities(data);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadExistingProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        // Pre-fill any existing data
        const employmentType = data.employment_type_preference as "fulltime" | "freelance" | "both" | null;
        const workLocations = Array.isArray(data.preferred_work_locations) 
          ? data.preferred_work_locations as Array<{ city: string; country: string; radius_km: number }>
          : [];
        
        setFormData(prev => ({
          ...prev,
          current_title: data.current_title || "",
          linkedin_url: data.linkedin_url || "",
          bio: data.career_preferences || "",
          employment_type: employmentType || "fulltime",
          notice_period: data.notice_period || "2_weeks",
          remote_work_aspiration: data.remote_work_aspiration || false,
          current_salary_min: data.current_salary_min || 50000,
          current_salary_max: data.current_salary_max || 70000,
          salary_preference_hidden: data.salary_preference_hidden || false,
          desired_salary_min: data.desired_salary_min || 70000,
          desired_salary_max: data.desired_salary_max || 90000,
          remote_work_preference: data.remote_work_preference || false,
          preferred_work_locations: workLocations,
          resume_url: data.resume_url || "",
          resume_filename: data.resume_filename || "",
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingResume(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/resume-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        resume_url: publicUrl,
        resume_filename: file.name,
      }));

      toast.success("Resume uploaded successfully!");
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      toast.error(error.message || "Failed to upload resume");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleRemoveResume = async () => {
    if (formData.resume_url && user) {
      try {
        const path = formData.resume_url.split('/resumes/')[1];
        await supabase.storage.from('resumes').remove([path]);
      } catch (error) {
        console.error('Error removing resume:', error);
      }
    }
    setFormData(prev => ({ ...prev, resume_url: "", resume_filename: "" }));
  };

  const addWorkLocation = () => {
    const city = cities.find(c => c.id === selectedCity);
    if (!city) return;

    setFormData(prev => ({
      ...prev,
      preferred_work_locations: [
        ...prev.preferred_work_locations,
        { city: city.name, country: city.country, radius_km: cityRadius }
      ]
    }));
    setSelectedCity("");
    setCityRadius(25);
  };

  const removeWorkLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preferred_work_locations: prev.preferred_work_locations.filter((_, i) => i !== index)
    }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0: // Professional
        if (!formData.current_title) {
          toast.error("Please enter your current job title");
          return false;
        }
        break;
      case 1: // Career
        if (!formData.dream_job_title) {
          toast.error("Please enter your dream job title");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('[OAuth Onboarding] Updating profile for user:', user.id);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          current_title: formData.current_title,
          linkedin_url: formData.linkedin_url || null,
          career_preferences: formData.bio || null,
          employment_type_preference: formData.employment_type,
          notice_period: formData.notice_period,
          remote_work_aspiration: formData.remote_work_aspiration,
          current_salary_min: formData.salary_preference_hidden ? null : formData.current_salary_min,
          current_salary_max: formData.salary_preference_hidden ? null : formData.current_salary_max,
          salary_preference_hidden: formData.salary_preference_hidden,
          desired_salary_min: formData.desired_salary_min,
          desired_salary_max: formData.desired_salary_max,
          freelance_hourly_rate_min: formData.freelance_hourly_rate_min,
          freelance_hourly_rate_max: formData.freelance_hourly_rate_max,
          remote_work_preference: formData.remote_work_preference,
          preferred_work_locations: formData.preferred_work_locations,
          resume_url: formData.resume_url || null,
          resume_filename: formData.resume_filename || null,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error("[OAuth Onboarding] Profile update error:", profileError);
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      console.log('[OAuth Onboarding] Profile updated successfully');
      toast.success("Profile completed! Welcome to The Quantum Club!");
      
      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 500);
    } catch (error: any) {
      console.error('[OAuth Onboarding] Error:', error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {STEPS.length}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 0: Professional Info */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Professional Information</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_title">Current Job Title *</Label>
                <Input
                  id="current_title"
                  placeholder="e.g., Senior Software Engineer"
                  value={formData.current_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn Profile (optional)</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your professional journey..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Resume (optional)</Label>
                {formData.resume_url ? (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm flex-1">{formData.resume_filename}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveResume}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingResume}
                  >
                    {isUploadingResume ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Upload Resume</>
                    )}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Step 1: Career Goals */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Career Goals</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dream_job_title">Dream Job Title *</Label>
                <Input
                  id="dream_job_title"
                  placeholder="e.g., CTO, Lead Engineer"
                  value={formData.dream_job_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, dream_job_title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employment_type">Employment Type</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, employment_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Full-time Only</SelectItem>
                    <SelectItem value="freelance">Freelance Only</SelectItem>
                    <SelectItem value="both">Open to Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notice_period">Notice Period</Label>
                <Select
                  value={formData.notice_period}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, notice_period: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="2_weeks">2 Weeks</SelectItem>
                    <SelectItem value="1_month">1 Month</SelectItem>
                    <SelectItem value="2_months">2 Months</SelectItem>
                    <SelectItem value="3_months">3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="remote_work">Open to Remote Work?</Label>
                  <p className="text-xs text-muted-foreground">Include remote opportunities</p>
                </div>
                <Switch
                  id="remote_work"
                  checked={formData.remote_work_aspiration}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, remote_work_aspiration: checked }))}
                />
              </div>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Salary Expectations</h4>
                </div>

                <div className="space-y-2">
                  <Label>Desired Salary Range: €{formData.desired_salary_min.toLocaleString()} - €{formData.desired_salary_max.toLocaleString()}</Label>
                  <Slider
                    min={30000}
                    max={300000}
                    step={5000}
                    value={[formData.desired_salary_min, formData.desired_salary_max]}
                    onValueChange={([min, max]) => setFormData(prev => ({ ...prev, desired_salary_min: min, desired_salary_max: max }))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.salary_preference_hidden}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, salary_preference_hidden: checked }))}
                  />
                  <Label className="text-sm">Hide current salary from employers</Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Work Preferences</h3>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label>Prefer Remote Work?</Label>
                  <p className="text-xs text-muted-foreground">Prioritize remote opportunities</p>
                </div>
                <Switch
                  checked={formData.remote_work_preference}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, remote_work_preference: checked }))}
                />
              </div>

              <div className="space-y-4">
                <Label>Preferred Work Locations (optional)</Label>
                <div className="flex gap-2">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}, {city.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={addWorkLocation}
                    disabled={!selectedCity}
                  >
                    Add
                  </Button>
                </div>

                {formData.preferred_work_locations.length > 0 && (
                  <div className="space-y-2">
                    {formData.preferred_work_locations.map((loc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <span className="text-sm">{loc.city}, {loc.country} (within {loc.radius_km}km)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWorkLocation(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            
            <div className="ml-auto">
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext} disabled={isLoading}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Completing...</>
                  ) : (
                    "Complete Profile"
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
