import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const referralSchema = z.object({
  friendName: z.string().min(2, "Name must be at least 2 characters"),
  friendEmail: z.string().email("Invalid email address"),
  friendLinkedin: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
  friendCurrentRole: z.string().optional(),
  friendCurrentCompany: z.string().optional(),
  whyGoodFit: z.string().min(10, "Please provide at least 10 characters explaining why this is a good fit"),
});

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export const ReferralDialog = ({ open, onOpenChange, jobId, jobTitle, companyName }: ReferralDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    friendName: "",
    friendEmail: "",
    friendLinkedin: "",
    friendCurrentRole: "",
    friendCurrentCompany: "",
    whyGoodFit: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate form
    const result = referralSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to refer a friend");
        return;
      }

      // Generate invite code
      const { data: inviteData, error: inviteError } = await supabase.rpc('generate_invite_code');
      
      if (inviteError) throw inviteError;
      
      const inviteCode = inviteData as string;

      // Create invite code record
      const { data: inviteRecord, error: inviteRecordError } = await supabase
        .from('invite_codes')
        .insert({
          code: inviteCode,
          created_by: user.id,
          created_by_type: 'member',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { job_id: jobId }
        })
        .select()
        .single();

      if (inviteRecordError) throw inviteRecordError;

      // Create referral metadata
      const { error: metadataError } = await supabase
        .from('referral_metadata')
        .insert({
          invite_code_id: inviteRecord.id,
          job_id: jobId,
          job_title: jobTitle,
          company_name: companyName,
          friend_name: formData.friendName,
          friend_email: formData.friendEmail,
          friend_linkedin: formData.friendLinkedin || null,
          friend_current_role: formData.friendCurrentRole || null,
          friend_current_company: formData.friendCurrentCompany || null,
          why_good_fit: formData.whyGoodFit,
        });

      if (metadataError) throw metadataError;

      // Send referral email
      await supabase.functions.invoke('send-referral-invite', {
        body: {
          inviteCode,
          friendEmail: formData.friendEmail,
          friendName: formData.friendName,
          jobTitle,
          companyName,
          referrerName: user.user_metadata?.full_name || user.email,
        }
      });

      toast.success(`Referral sent to ${formData.friendName}! They'll receive an email with a personalized invite.`);
      
      // Reset form
      setFormData({
        friendName: "",
        friendEmail: "",
        friendLinkedin: "",
        friendCurrentRole: "",
        friendCurrentCompany: "",
        whyGoodFit: "",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error("Failed to send referral. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refer a Friend</DialogTitle>
          <DialogDescription>
            Refer {jobTitle} at {companyName}. Fill in your friend's details to help them get started faster.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="friendName">Friend's Full Name *</Label>
            <Input
              id="friendName"
              value={formData.friendName}
              onChange={(e) => setFormData({ ...formData, friendName: e.target.value })}
              placeholder="John Doe"
            />
            {errors.friendName && <p className="text-sm text-destructive">{errors.friendName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="friendEmail">Friend's Email *</Label>
            <Input
              id="friendEmail"
              type="email"
              value={formData.friendEmail}
              onChange={(e) => setFormData({ ...formData, friendEmail: e.target.value })}
              placeholder="john@example.com"
            />
            {errors.friendEmail && <p className="text-sm text-destructive">{errors.friendEmail}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="friendLinkedin">Friend's LinkedIn URL</Label>
            <Input
              id="friendLinkedin"
              value={formData.friendLinkedin}
              onChange={(e) => setFormData({ ...formData, friendLinkedin: e.target.value })}
              placeholder="https://linkedin.com/in/johndoe"
            />
            {errors.friendLinkedin && <p className="text-sm text-destructive">{errors.friendLinkedin}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="friendCurrentRole">Current Role</Label>
              <Input
                id="friendCurrentRole"
                value={formData.friendCurrentRole}
                onChange={(e) => setFormData({ ...formData, friendCurrentRole: e.target.value })}
                placeholder="Senior Developer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="friendCurrentCompany">Current Company</Label>
              <Input
                id="friendCurrentCompany"
                value={formData.friendCurrentCompany}
                onChange={(e) => setFormData({ ...formData, friendCurrentCompany: e.target.value })}
                placeholder="TechCorp"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whyGoodFit">Why is this a good fit? *</Label>
            <Textarea
              id="whyGoodFit"
              value={formData.whyGoodFit}
              onChange={(e) => setFormData({ ...formData, whyGoodFit: e.target.value })}
              placeholder="Explain why you think your friend would be a great fit for this role..."
              rows={4}
            />
            {errors.whyGoodFit && <p className="text-sm text-destructive">{errors.whyGoodFit}</p>}
          </div>

          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="text-muted-foreground">
              🔒 Your friend's information will be pre-filled during signup and they can edit it. 
              This data expires after 30 days if unused.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Referral"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};