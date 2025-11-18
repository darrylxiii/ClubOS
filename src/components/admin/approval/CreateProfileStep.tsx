import { useState } from "react";
import { CandidateProfileData, MemberRequest } from "@/types/approval";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, UserPlus } from "lucide-react";

interface CreateProfileStepProps {
  request: MemberRequest;
  adminId: string;
  onCreateProfile: (profileData: CandidateProfileData) => void;
  onSkipProfile: () => void;
  onBack: () => void;
}

export const CreateProfileStep = ({ 
  request, 
  adminId, 
  onCreateProfile,
  onSkipProfile,
  onBack 
}: CreateProfileStepProps) => {
  const [formData, setFormData] = useState<Partial<CandidateProfileData>>({
    full_name: request.name,
    email: request.email,
    phone: request.phone || undefined,
    current_title: request.title_or_company || request.profiles?.current_title || undefined,
    linkedin_url: request.linkedin_url || request.profiles?.linkedin_url || undefined,
    location: request.location || request.profiles?.location || undefined,
    desired_salary_min: request.desired_salary_min || undefined,
    desired_salary_max: request.desired_salary_max || undefined,
    remote_work_preference: true,
    skills: [],
    years_of_experience: undefined,
    notice_period: undefined,
  });

  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills?.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills?.filter(s => s !== skill) || [],
    });
  };

  const handleSubmit = () => {
    const profileData: CandidateProfileData = {
      full_name: formData.full_name!,
      email: formData.email!,
      phone: formData.phone,
      current_title: formData.current_title,
      linkedin_url: formData.linkedin_url,
      location: formData.location,
      skills: formData.skills,
      years_of_experience: formData.years_of_experience,
      desired_salary_min: formData.desired_salary_min,
      desired_salary_max: formData.desired_salary_max,
      remote_work_preference: formData.remote_work_preference,
      notice_period: formData.notice_period,
      source_channel: 'admin_approval',
      source_metadata: {
        request_id: request.id,
        request_type: request.request_type,
      },
      created_by: adminId,
    };

    onCreateProfile(profileData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Create Candidate Profile</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You can approve this member without creating a candidate profile. A profile can be created later if needed.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_title">Current Title</Label>
              <Input
                id="current_title"
                value={formData.current_title || ''}
                onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                value={formData.linkedin_url || ''}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="years_of_experience">Years of Experience</Label>
              <Input
                id="years_of_experience"
                type="number"
                value={formData.years_of_experience || ''}
                onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || undefined })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice_period">Notice Period</Label>
              <Input
                id="notice_period"
                placeholder="e.g., 1 month"
                value={formData.notice_period || ''}
                onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desired_salary_min">Min Desired Salary (€)</Label>
              <Input
                id="desired_salary_min"
                type="number"
                value={formData.desired_salary_min || ''}
                onChange={(e) => setFormData({ ...formData, desired_salary_min: parseInt(e.target.value) || undefined })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desired_salary_max">Max Desired Salary (€)</Label>
              <Input
                id="desired_salary_max"
                type="number"
                value={formData.desired_salary_max || ''}
                onChange={(e) => setFormData({ ...formData, desired_salary_max: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <div className="flex gap-2">
              <Input
                id="skills"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add a skill"
              />
              <Button type="button" onClick={handleAddSkill} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.skills?.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => handleRemoveSkill(skill)} 
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remote_work_preference"
              checked={formData.remote_work_preference}
              onCheckedChange={(checked) => setFormData({ ...formData, remote_work_preference: checked as boolean })}
            />
            <Label htmlFor="remote_work_preference" className="cursor-pointer">
              Open to remote work
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            onClick={onSkipProfile}
          >
            Skip Profile Creation
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.full_name || !formData.email}
          >
            Create Profile & Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
