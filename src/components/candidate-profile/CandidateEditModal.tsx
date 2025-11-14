import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { OverallAssessmentEditor } from '@/components/partner/edit/OverallAssessmentEditor';
import { BasicInformationEditor } from '@/components/partner/edit/BasicInformationEditor';
import { WorkAuthorizationEditor } from '@/components/partner/edit/WorkAuthorizationEditor';
import { CareerPreferencesEditor } from '@/components/partner/edit/CareerPreferencesEditor';
import { SkillsExperienceEditor } from '@/components/partner/edit/SkillsExperienceEditor';
import { AdminNotesEditor } from '@/components/partner/edit/AdminNotesEditor';
import { Loader2 } from 'lucide-react';

interface CandidateEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
  onSaved: () => void;
}

export function CandidateEditModal({ open, onOpenChange, candidate, onSaved }: CandidateEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [changes, setChanges] = useState<any>({
    basic: null,
    assessment: null,
    workAuth: null,
    career: null,
    skills: null,
    adminNotes: null,
  });

  const handleSaveAll = async () => {
    if (!changeReason.trim()) {
      toast.error('Please provide a reason for the changes');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch current candidate data for audit trail
      const { data: beforeData } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidate.id)
        .single();

      // Build update object from all changes
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (changes.basic) {
        Object.assign(updates, changes.basic);
      }

      if (changes.assessment) {
        updates.fit_score = changes.assessment.fitScore;
        updates.engagement_score = changes.assessment.engagementScore;
        updates.internal_rating = changes.assessment.internalRating;
        updates.ai_generated_summary = changes.assessment.aiSummary;
      }

      if (changes.workAuth) {
        Object.assign(updates, changes.workAuth);
      }

      if (changes.career) {
        Object.assign(updates, changes.career);
      }

      if (changes.skills) {
        Object.assign(updates, changes.skills);
      }

      if (changes.adminNotes) {
        Object.assign(updates, changes.adminNotes);
      }

      // Update candidate profile with all changes
      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update(updates)
        .eq('id', candidate.id);

      if (updateError) throw updateError;

      // Fetch updated data for audit trail
      const { data: afterData } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidate.id)
        .single();

      // Determine changed fields
      const changedFields: string[] = [];
      if (beforeData && afterData) {
        Object.keys(afterData).forEach(key => {
          if (JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key])) {
            changedFields.push(key);
          }
        });
      }

      // Log to audit trail
      await (supabase as any)
        .from('candidate_profile_audit')
        .insert({
          candidate_id: candidate.id,
          action: 'update',
          performed_by: user.id,
          before_data: beforeData,
          after_data: afterData,
          changed_fields: changedFields,
          reason: changeReason,
          metadata: {
            via: 'comprehensive_edit_modal',
            sections_edited: Object.keys(changes).filter(k => changes[k] !== null),
          },
        });

      toast.success('Profile updated successfully');
      onSaved();
      onOpenChange(false);
      setChangeReason('');
      setChanges({ assessment: null });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setChanges({ basic: null, assessment: null, workAuth: null, career: null, skills: null, adminNotes: null });
    setChangeReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Candidate Profile</DialogTitle>
          <DialogDescription>
            Make changes to {candidate?.first_name} {candidate?.last_name}'s profile. All changes will be saved together.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="assessment" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="work_auth">Work Auth</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="assessment" className="mt-0">
              <OverallAssessmentEditor
                candidate={candidate}
                onChange={(data) => setChanges({ ...changes, assessment: data })}
              />
            </TabsContent>

            <TabsContent value="work_auth" className="mt-0">
              <div className="space-y-4 text-muted-foreground">
                <p>Work authorization editing coming soon...</p>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="mt-0">
              <div className="space-y-4 text-muted-foreground">
                <p>Career preferences editing coming soon...</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="change-reason">Reason for Changes *</Label>
            <Textarea
              id="change-reason"
              placeholder="Explain why these changes are being made..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveAll} disabled={isSaving || !changeReason.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save All Changes'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
