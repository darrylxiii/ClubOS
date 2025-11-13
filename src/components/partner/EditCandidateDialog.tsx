import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
  onSave: () => void;
}

export function EditCandidateDialog({ open, onOpenChange, candidate, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    current_title: '',
    current_company: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    years_of_experience: '',
    desired_salary_min: '',
    desired_salary_max: '',
    preferred_currency: 'EUR',
    notice_period: '',
    remote_preference: '',
    desired_locations: '',
    ai_summary: '',
    skills: '',
    languages: '',
  });

  useEffect(() => {
    if (candidate) {
      setFormData({
        full_name: candidate.full_name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        current_title: candidate.current_title || '',
        current_company: candidate.current_company || '',
        linkedin_url: candidate.linkedin_url || '',
        github_url: candidate.github_url || '',
        portfolio_url: candidate.portfolio_url || '',
        years_of_experience: candidate.years_of_experience?.toString() || '',
        desired_salary_min: candidate.desired_salary_min?.toString() || '',
        desired_salary_max: candidate.desired_salary_max?.toString() || '',
        preferred_currency: candidate.preferred_currency || 'EUR',
        notice_period: candidate.notice_period || '',
        remote_preference: candidate.remote_preference || '',
        desired_locations: Array.isArray(candidate.desired_locations) 
          ? candidate.desired_locations.join(', ') 
          : '',
        ai_summary: candidate.ai_summary || '',
        skills: Array.isArray(candidate.skills) 
          ? candidate.skills.map((s: any) => typeof s === 'string' ? s : s.name).join(', ')
          : '',
        languages: Array.isArray(candidate.languages)
          ? candidate.languages.map((l: any) => typeof l === 'string' ? l : l.language).join(', ')
          : '',
      });
    }
  }, [candidate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Parse arrays and numbers
      const updateData: any = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        current_title: formData.current_title || null,
        current_company: formData.current_company || null,
        linkedin_url: formData.linkedin_url || null,
        github_url: formData.github_url || null,
        portfolio_url: formData.portfolio_url || null,
        years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
        desired_salary_min: formData.desired_salary_min ? parseInt(formData.desired_salary_min) : null,
        desired_salary_max: formData.desired_salary_max ? parseInt(formData.desired_salary_max) : null,
        preferred_currency: formData.preferred_currency,
        notice_period: formData.notice_period || null,
        remote_preference: formData.remote_preference || null,
        desired_locations: formData.desired_locations 
          ? formData.desired_locations.split(',').map(l => l.trim()).filter(Boolean)
          : [],
        ai_summary: formData.ai_summary || null,
        skills: formData.skills 
          ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        languages: formData.languages
          ? formData.languages.split(',').map(l => l.trim()).filter(Boolean)
          : [],
        last_profile_update: new Date().toISOString(),
      };

      // Get before state for audit
      const { data: beforeState } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidate.id)
        .single();

      const { data: afterState, error: updateError } = await supabase
        .from('candidate_profiles')
        .update(updateData)
        .eq('id', candidate.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log audit entry
      const changedFields = Object.keys(updateData).filter(
        key => JSON.stringify(beforeState?.[key]) !== JSON.stringify(updateData[key])
      );

      await (supabase as any).from('candidate_profile_audit').insert({
        candidate_id: candidate.id,
        action: 'update',
        performed_by: user.id,
        before_data: beforeState,
        after_data: afterState,
        changed_fields: changedFields,
        reason: 'Profile updated via edit dialog',
        metadata: {
          action: 'profile_edit',
          updated_fields: Object.keys(updateData),
        },
        created_by: user.id,
        is_internal: true,
        visible_to_candidate: false,
      });

      toast.success("Candidate profile updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error("Failed to update candidate profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Candidate Profile</DialogTitle>
          <DialogDescription>
            Update candidate information. All changes will be logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="years_of_experience">Years of Experience</Label>
                <Input
                  id="years_of_experience"
                  type="number"
                  value={formData.years_of_experience}
                  onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Current Position */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Current Position</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current_title">Current Title</Label>
                <Input
                  id="current_title"
                  value={formData.current_title}
                  onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="current_company">Current Company</Label>
                <Input
                  id="current_company"
                  value={formData.current_company}
                  onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Links</h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  type="url"
                  placeholder="https://github.com/..."
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="portfolio_url">Portfolio URL</Label>
                <Input
                  id="portfolio_url"
                  type="url"
                  placeholder="https://..."
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Compensation Expectations</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="desired_salary_min">Min Salary</Label>
                <Input
                  id="desired_salary_min"
                  type="number"
                  value={formData.desired_salary_min}
                  onChange={(e) => setFormData({ ...formData, desired_salary_min: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="desired_salary_max">Max Salary</Label>
                <Input
                  id="desired_salary_max"
                  type="number"
                  value={formData.desired_salary_max}
                  onChange={(e) => setFormData({ ...formData, desired_salary_max: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="preferred_currency">Currency</Label>
                <Input
                  id="preferred_currency"
                  value={formData.preferred_currency}
                  onChange={(e) => setFormData({ ...formData, preferred_currency: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Preferences</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notice_period">Notice Period</Label>
                <Input
                  id="notice_period"
                  placeholder="e.g., 1 month, 2 weeks"
                  value={formData.notice_period}
                  onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="remote_preference">Remote Preference</Label>
                <Input
                  id="remote_preference"
                  placeholder="e.g., Hybrid, Remote, On-site"
                  value={formData.remote_preference}
                  onChange={(e) => setFormData({ ...formData, remote_preference: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="desired_locations">Desired Locations (comma-separated)</Label>
              <Input
                id="desired_locations"
                placeholder="e.g., Amsterdam, Berlin, London"
                value={formData.desired_locations}
                onChange={(e) => setFormData({ ...formData, desired_locations: e.target.value })}
              />
            </div>
          </div>

          {/* Skills & Languages */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Skills & Languages</h3>
            
            <div>
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Textarea
                id="skills"
                placeholder="e.g., React, TypeScript, Node.js, Python"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="languages">Languages (comma-separated)</Label>
              <Input
                id="languages"
                placeholder="e.g., English, Dutch, German"
                value={formData.languages}
                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
              />
            </div>
          </div>

          {/* AI Summary */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">AI Summary</h3>
            
            <div>
              <Label htmlFor="ai_summary">AI-Generated Summary</Label>
              <Textarea
                id="ai_summary"
                placeholder="Brief summary of candidate's profile..."
                value={formData.ai_summary}
                onChange={(e) => setFormData({ ...formData, ai_summary: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.full_name || !formData.email}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
