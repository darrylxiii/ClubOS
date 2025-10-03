import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Briefcase, DollarSign, Target, User } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [referralMetadata, setReferralMetadata] = useState<any>(null);
  const [referrerName, setReferrerName] = useState<string>("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    currentTitle: "",
    linkedin: "",
    currentSalary: "",
    desiredSalary: "",
    noticePeriod: "",
    preferences: "",
  });
  const [resume, setResume] = useState<File | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }

      // Check for invite code with metadata
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get('invite');
      
      if (inviteCode) {
        const { data: inviteData } = await supabase
          .from('invite_codes')
          .select(`
            *,
            referral_metadata (*)
          `)
          .eq('code', inviteCode)
          .single();

        if (inviteData?.referral_metadata?.[0]) {
          const metadata = inviteData.referral_metadata[0];
          setReferralMetadata(metadata);
          
          // Get referrer name
          const { data: referrerData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', inviteData.created_by)
            .single();
          
          setReferrerName(referrerData?.full_name || referrerData?.email || 'Your friend');

          // Pre-fill form data
          setFormData(prev => ({
            ...prev,
            firstName: metadata.friend_name?.split(' ')[0] || prev.firstName,
            lastName: metadata.friend_name?.split(' ').slice(1).join(' ') || prev.lastName,
            currentTitle: metadata.friend_current_role || prev.currentTitle,
            linkedin: metadata.friend_linkedin || prev.linkedin,
          }));

          toast.success(`Welcome! ${referrerName} referred you for ${metadata.job_title} at ${metadata.company_name}`, {
            description: "We've pre-filled some information to get you started faster."
          });
        }
      }
    };

    loadProfile();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
      toast.success("Resume uploaded successfully");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!avatarUrl) {
      toast.error("Please upload a profile picture to continue");
      return;
    }
    
    // Here you would typically send data to backend for processing
    console.log("Form submitted:", formData);
    console.log("Resume:", resume);
    
    toast.success("Profile created successfully!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-accent bg-clip-text text-transparent">
            Welcome to The Quantum Club
          </h1>
          <p className="text-muted-foreground">
            Complete your profile to access exclusive executive opportunities
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user && (
                <>
                  <AvatarUpload
                    avatarUrl={avatarUrl}
                    onAvatarChange={setAvatarUrl}
                    userId={user.id}
                    required={true}
                  />
                  <div className="pt-4 border-t" />
                </>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    {referralMetadata && formData.firstName && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Provided by {referrerName}
                      </span>
                    )}
                  </div>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    {referralMetadata && formData.lastName && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Provided by {referrerName}
                      </span>
                    )}
                  </div>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                    required
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="currentTitle">Current Title *</Label>
                    {referralMetadata && formData.currentTitle && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Provided by {referrerName}
                      </span>
                    )}
                  </div>
                  <Input
                    id="currentTitle"
                    name="currentTitle"
                    value={formData.currentTitle}
                    onChange={handleInputChange}
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  {referralMetadata && formData.linkedin && (
                    <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                      Provided by {referrerName}
                    </span>
                  )}
                </div>
                <Input
                  id="linkedin"
                  name="linkedin"
                  type="url"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="bg-background/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Resume Upload */}
          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Resume/CV
              </CardTitle>
              <CardDescription>Upload your resume for automatic profile enhancement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="resume"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="resume" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <p className="text-sm font-medium mb-1">
                    {resume ? resume.name : "Click to upload your resume"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, or DOCX (Max 10MB)
                  </p>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Compensation & Availability */}
          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Compensation & Availability
              </CardTitle>
              <CardDescription>Help us match you with the right opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentSalary">
                    Current Salary Range (Optional)
                  </Label>
                  <Input
                    id="currentSalary"
                    name="currentSalary"
                    value={formData.currentSalary}
                    onChange={handleInputChange}
                    placeholder="e.g., $150,000 - $200,000"
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This information is confidential and helps us better match opportunities
                  </p>
                </div>
                <div>
                  <Label htmlFor="desiredSalary">
                    Desired Salary Range *
                  </Label>
                  <Input
                    id="desiredSalary"
                    name="desiredSalary"
                    value={formData.desiredSalary}
                    onChange={handleInputChange}
                    placeholder="e.g., $180,000 - $250,000"
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="noticePeriod">Notice Period</Label>
                <Input
                  id="noticePeriod"
                  name="noticePeriod"
                  value={formData.noticePeriod}
                  onChange={handleInputChange}
                  placeholder="e.g., 2 weeks, 1 month, Immediate"
                  className="bg-background/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Job Preferences */}
          <Card className="border-primary/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Job Preferences
              </CardTitle>
              <CardDescription>What are you looking for in your next role?</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="preferences">Preferences & Requirements</Label>
                <Textarea
                  id="preferences"
                  name="preferences"
                  value={formData.preferences}
                  onChange={handleInputChange}
                  placeholder="e.g., Remote work, specific industries, company size, leadership opportunities, relocation preferences..."
                  rows={6}
                  className="bg-background/50 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Share any specific requirements or preferences to help us find your perfect match
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
            >
              Skip for Now
            </Button>
            <Button
              type="submit"
              className="bg-gradient-accent text-background font-semibold px-8 shadow-glow hover:opacity-90 transition-opacity"
            >
              Complete Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
