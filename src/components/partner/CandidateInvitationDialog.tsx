import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Loader2, Briefcase } from "lucide-react";

interface Job {
  id: string;
  title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  suggestedJobs?: Job[];
}

export const CandidateInvitationDialog = ({
  open,
  onOpenChange,
  candidateId,
  candidateEmail,
  candidateName,
  suggestedJobs = []
}: Props) => {
  const [sending, setSending] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [personalMessage, setPersonalMessage] = useState(
    `Hi ${candidateName.split(' ')[0]},\n\nWe've been impressed with your background and believe you'd be a great fit for opportunities with The Quantum Club.\n\nWe'd love to invite you to join our platform where you can explore exclusive roles and manage your career journey.\n\nLooking forward to connecting!`
  );

  const handleSend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-candidate-invitation', {
        body: {
          candidateId,
          message: personalMessage,
          jobContext: selectedJobs.map(j => ({ job_id: j.id, job_title: j.title }))
        }
      });

      if (error) throw error;

      toast.success('Invitation sent successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const toggleJob = (job: Job) => {
    setSelectedJobs(prev => 
      prev.find(j => j.id === job.id)
        ? prev.filter(j => j.id !== job.id)
        : [...prev, job]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invite Candidate to Platform
          </DialogTitle>
          <DialogDescription>
            Send a personalized invitation to {candidateName} to join The Quantum Club
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Email Address</Label>
            <Input value={candidateEmail} disabled className="bg-muted" />
          </div>

          {suggestedJobs.length > 0 && (
            <div>
              <Label>Link to Specific Jobs (Optional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestedJobs.map(job => (
                  <Badge
                    key={job.id}
                    variant={selectedJobs.find(j => j.id === job.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleJob(job)}
                  >
                    <Briefcase className="w-3 h-3 mr-1" />
                    {job.title}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selected jobs will be mentioned in the invitation email
              </p>
            </div>
          )}

          <div>
            <Label>Personal Message</Label>
            <Textarea
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This message will be included in the invitation email
            </p>
          </div>

          <div className="bg-muted/30 border border-border rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">What happens next?</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
              <li>Candidate receives invitation email with secure link</li>
              <li>Link expires in 7 days</li>
              <li>When they sign up, their profile data will be merged with user account</li>
              <li>They'll have full access to platform features</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
