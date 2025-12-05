import { useState } from "react";
import { CandidateProfileData, MemberRequest } from "@/types/approval";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, UserPlus } from "lucide-react";

interface CreateProfileStepProps {
  request: MemberRequest;
  adminId: string;
  onCreateProfile: (profileData: CandidateProfileData) => void;
  onSkipProfile: () => void;
  onBack: () => void;
}

// FIX #6: Use correct types matching database schema
type RemotePreference = 'remote' | 'hybrid' | 'on-site' | null;

interface FormData {
  full_name: string;
  email: string;
  phone?: string;
  current_title?: string;
  linkedin_url?: string;
  desired_locations: string[]; // FIX #3: Changed from location string to desired_locations array
  desired_salary_min?: number;
  desired_salary_max?: number;
  remote_preference: RemotePreference; // FIX #6: Changed from boolean to enum
  skills: string[];
  years_of_experience?: number;
  notice_period?: string;
}

export const CreateProfileStep = ({ 
  request, 
  adminId, 
  onCreateProfile,
  onSkipProfile,
  onBack 
}: CreateProfileStepProps) => {
  // FIX #3 & #6: Initialize with correct field types
  const [formData, setFormData] = useState<FormData>({
    full_name: request.name,
    email: request.email,
    phone: request.phone || undefined,
    current_title: request.title_or_company || request.profiles?.current_title || undefined,
    linkedin_url: request.linkedin_url || request.profiles?.linkedin_url || undefined,
    desired_locations: request.location || request.profiles?.location 
      ? [request.location || request.profiles?.location || ''].filter(Boolean) as string[]
      : [], // FIX #3: Convert single location to array
    desired_salary_min: request.desired_salary_min || undefined,
    desired_salary_max: request.desired_salary_max || undefined,
    remote_preference: 'hybrid', // FIX #6: Default to hybrid instead of boolean true
    skills: [],
    years_of_experience: undefined,
    notice_period: undefined,
  });

  const [newSkill, setNewSkill] = useState('');
  const [newLocation, setNewLocation] = useState(''); // FIX #3: Support multiple locations

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

  // FIX #3: Handle multiple locations
  const handleAddLocation = () => {
    if (newLocation.trim() && !formData.desired_locations.includes(newLocation.trim())) {
      setFormData({
        ...formData,
        desired_locations: [...formData.desired_locations, newLocation.trim()],
      });
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (location: string) => {
    setFormData({
      ...formData,
      desired_locations: formData.desired_locations.filter(l => l !== location),
    });
  };

  const handleSubmit = () => {
    // FIX #3 & #6: Map to correct schema types
    const profileData: CandidateProfileData = {
      full_name: formData.full_name!,
      email: formData.email!,
      phone: formData.phone,
      current_title: formData.current_title,
      linkedin_url: formData.linkedin_url,
      desired_locations: formData.desired_locations.length > 0 ? formData.desired_locations : undefined, // FIX #3
      skills: formData.skills,
      years_of_experience: formData.years_of_experience,
      desired_salary_min: formData.desired_salary_min,
      desired_salary_max: formData.desired_salary_max,
      remote_preference: formData.remote_preference, // FIX #6: Already correct type
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

            {/* FIX #6: Remote preference as dropdown instead of checkbox */}
            <div className="space-y-2">
              <Label htmlFor="remote_preference">Work Preference</Label>
              <Select
                value={formData.remote_preference || 'hybrid'}
                onValueChange={(value) => setFormData({ ...formData, remote_preference: value as RemotePreference })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote Only</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="on-site">On-Site Only</SelectItem>
                </SelectContent>
              </Select>
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

          {/* FIX #3: Desired locations as multiple values */}
          <div className="space-y-2">
            <Label htmlFor="locations">Desired Locations</Label>
            <div className="flex gap-2">
              <Input
                id="locations"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                placeholder="Add a location (e.g., Amsterdam, Remote)"
              />
              <Button type="button" onClick={handleAddLocation} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.desired_locations.map((location) => (
                <Badge key={location} variant="secondary" className="gap-1">
                  {location}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => handleRemoveLocation(location)} 
                  />
                </Badge>
              ))}
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
