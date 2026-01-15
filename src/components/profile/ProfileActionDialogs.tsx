import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Calendar, Award, Download, ThumbsUp, Users, Shield, Sparkles } from "lucide-react";

interface DialogsState {
  resume: boolean;
  meeting: boolean;
  verification: boolean;
  export: boolean;
  endorse: boolean;
  invite: boolean;
  report: boolean;
}

interface ProfileActionDialogsProps {
  dialogs: DialogsState;
  meetingType?: string;
  exportType?: string;
  onClose: (dialog: keyof DialogsState) => void;
  onSubmit: (dialog: keyof DialogsState, data?: any) => void;
}

export function ProfileActionDialogs({
  dialogs,
  meetingType,
  exportType,
  onClose,
  onSubmit,
}: ProfileActionDialogsProps) {
  const [message, setMessage] = useState("");
  const [endorsementType, setEndorsementType] = useState("skill");
  const [reportReason, setReportReason] = useState("spam");

  return (
    <>
      {/* Request Resume Dialog */}
      <Dialog open={dialogs.resume} onOpenChange={() => onClose('resume')}>
        <DialogContent className="glass backdrop-blur-xl border-2 border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Request Resume
            </DialogTitle>
            <DialogDescription>
              Request an AI-analyzed resume from this member. They'll receive a notification and can share their resume or portfolio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resume-message">Add a message (optional)</Label>
              <Textarea
                id="resume-message"
                placeholder="I'd love to learn more about your experience..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="glass"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onClose('resume')}>
                Cancel
              </Button>
              <Button onClick={() => {
                onSubmit('resume', { message });
                setMessage("");
              }}>
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Meeting Dialog */}
      <Dialog open={dialogs.meeting} onOpenChange={() => onClose('meeting')}>
        <DialogContent className="glass backdrop-blur-xl border-2 border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              {meetingType === 'video' && 'Schedule Video Call'}
              {meetingType === 'vr' && 'Meet in Club Lounge (VR)'}
              {meetingType === 'advisory' && 'Request 1-on-1 Advisory'}
              {meetingType === 'suggest' && 'AI-Suggested Meeting Time'}
            </DialogTitle>
            <DialogDescription>
              {meetingType === 'suggest' ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  AI is analyzing calendars to suggest the best meeting time...
                </span>
              ) : (
                'Select your preferred time slot and add meeting details.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="meeting-message">Meeting purpose</Label>
              <Textarea
                id="meeting-message"
                placeholder="Describe what you'd like to discuss..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="glass"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onClose('meeting')}>
                Cancel
              </Button>
              <Button onClick={() => {
                onSubmit('meeting', { type: meetingType, message });
                setMessage("");
              }}>
                {meetingType === 'suggest' ? 'Get AI Suggestions' : 'Send Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Verification Dialog */}
      <Dialog open={dialogs.verification} onOpenChange={() => onClose('verification')}>
        <DialogContent className="glass backdrop-blur-xl border-2 border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" />
              Request Quantum Verification
            </DialogTitle>
            <DialogDescription>
              Request verification for this member's credentials, skills, or achievements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="verification-message">Verification details</Label>
              <Textarea
                id="verification-message"
                placeholder="Specify what you'd like to verify..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="glass"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onClose('verification')}>
                Cancel
              </Button>
              <Button onClick={() => {
                onSubmit('verification', { message });
                setMessage("");
              }}>
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={dialogs.export} onOpenChange={() => onClose('export')}>
        <DialogContent className="glass backdrop-blur-xl border-2 border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-accent" />
              {exportType === 'summary' ? 'Download AI Career Summary' : 'Export Quantum ID'}
            </DialogTitle>
            <DialogDescription>
              {exportType === 'summary' 
                ? 'Generate an AI-powered career summary in PDF format.'
                : 'Export contact information as a Quantum ID vCard with AR code.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onClose('export')}>
              Cancel
            </Button>
            <Button onClick={() => onSubmit('export', { type: exportType })}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Endorse Dialog */}
      <Dialog open={dialogs.endorse} onOpenChange={() => onClose('endorse')}>
        <DialogContent className="glass backdrop-blur-xl border-2 border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-accent" />
              Endorse Member
            </DialogTitle>
            <DialogDescription>
              Share your experience working with this member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Endorsement Type</Label>
              <RadioGroup value={endorsementType} onValueChange={setEndorsementType} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skill" id="skill" />
                  <Label htmlFor="skill" className="font-normal">Skills & Expertise</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="collaboration" id="collaboration" />
                  <Label htmlFor="collaboration" className="font-normal">Collaboration</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="leadership" id="leadership" />
                  <Label htmlFor="leadership" className="font-normal">Leadership</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="endorse-message">Your endorsement</Label>
              <Textarea
                id="endorse-message"
                placeholder="Share your experience..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="glass"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onClose('endorse')}>
                Cancel
              </Button>
              <Button onClick={() => {
                onSubmit('endorse', { type: endorsementType, message });
                setMessage("");
              }}>
                Submit Endorsement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite to Project Dialog */}
      <Dialog open={dialogs.invite} onOpenChange={() => onClose('invite')}>
        <DialogContent className="glass backdrop-blur-xl border-2 border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Invite to Club Project
            </DialogTitle>
            <DialogDescription>
              Invite this member to collaborate on a private club project or team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-message">Project details</Label>
              <Textarea
                id="invite-message"
                placeholder="Describe the project and role..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="glass"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onClose('invite')}>
                Cancel
              </Button>
              <Button onClick={() => {
                onSubmit('invite', { message });
                setMessage("");
              }}>
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report/Block Dialog */}
      <Dialog open={dialogs.report} onOpenChange={() => onClose('report')}>
        <DialogContent className="glass backdrop-blur-xl border-2 border-accent/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Report or Block User
            </DialogTitle>
            <DialogDescription>
              Help keep the Quantum Club safe by reporting inappropriate behavior.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spam" id="spam" />
                  <Label htmlFor="spam" className="font-normal">Spam</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="harassment" id="harassment" />
                  <Label htmlFor="harassment" className="font-normal">Harassment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inappropriate" id="inappropriate" />
                  <Label htmlFor="inappropriate" className="font-normal">Inappropriate Content</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal">Other</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="report-message">Additional details</Label>
              <Textarea
                id="report-message"
                placeholder="Provide more information..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="glass"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onClose('report')}>
                Cancel
              </Button>
              <Button variant="ghost" onClick={() => {
                onSubmit('report', { reason: reportReason, message });
                setMessage("");
                setReportReason("spam");
              }}>
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
